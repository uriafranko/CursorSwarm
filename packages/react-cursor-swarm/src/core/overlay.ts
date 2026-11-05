import type { SwarmEngine, Live } from "./engine";
import type { Task } from "./task";
import type { Agent } from "./agent";
import type { Box, Point } from "./util";

const FONT = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const MEASURE = "#F24822";

const SHADOW_CSS = `
:host { all: initial; }
.layer { position: absolute; inset: 0; overflow: hidden; }
.v { position: absolute; inset: 0; }
.a { position: absolute; left: 0; top: 0; box-sizing: border-box; will-change: transform; }
.sel { border: 1px solid var(--c); }
.ph { background: color-mix(in srgb, var(--c) 10%, rgba(128, 128, 140, 0.2)); }
.h { width: 7px; height: 7px; background: #fff; border: 1px solid var(--c); border-radius: 1px; }
.badge {
  font: 600 10px/1 ${FONT}; color: #fff; background: var(--c);
  padding: 3px 5px; border-radius: 3px; white-space: nowrap;
  font-variant-numeric: tabular-nums; letter-spacing: 0.01em;
}
.tbox { border: 1px solid var(--c); }
.caret { width: 1.5px; background: var(--c); border-radius: 1px; }
.caret.blink { animation: swarm-blink 1.05s steps(1) infinite; }
@keyframes swarm-blink { 50% { opacity: 0; } }
.ghost { border: 1px dashed var(--c); background: color-mix(in srgb, var(--c) 7%, transparent); }
.mline { background: ${MEASURE}; }
.mlabel { background: ${MEASURE}; }
svg.pen { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.agent { position: absolute; left: 0; top: 0; will-change: transform; }
.agent > svg {
  position: absolute; width: 24px; height: 24px; overflow: visible;
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.35));
  transition: transform 90ms ease-out;
}
.agent.down > svg { transform: scale(0.84); }
.name {
  position: absolute; left: 13px; top: 17px;
  font: 600 11px/1 ${FONT}; color: #fff; background: var(--c);
  padding: 4px 7px 4px 6px; border-radius: 3px 9px 9px 9px; white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}
`;

/** Fixed full-viewport layer, isolated from the app's CSS in a shadow root. */
export class Overlay {
  host: HTMLDivElement;
  visuals: HTMLDivElement;
  agents: HTMLDivElement;

  constructor(zIndex: number) {
    this.host = document.createElement("div");
    this.host.setAttribute("data-swarm-overlay", "");
    this.host.setAttribute("aria-hidden", "true");
    this.host.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${zIndex};contain:strict;`;
    const shadow = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = SHADOW_CSS;
    this.visuals = document.createElement("div");
    this.visuals.className = "layer";
    this.agents = document.createElement("div");
    this.agents.className = "layer";
    shadow.append(style, this.visuals, this.agents);
    document.body.appendChild(this.host);
  }

  setZIndex(z: number) {
    this.host.style.zIndex = String(z);
  }

  destroy() {
    this.host.remove();
  }
}

export function div(cls: string, parent?: Element): HTMLDivElement {
  const d = document.createElement("div");
  d.className = cls;
  parent?.appendChild(d);
  return d;
}

export function place(el: HTMLElement, b: Box) {
  el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
  el.style.width = `${Math.max(0, b.w)}px`;
  el.style.height = `${Math.max(0, b.h)}px`;
}

function boxFrom(a: Point, b: Point): Box {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

/** Anything drawn on the overlay for a task. Re-laid out every frame from live element rects. */
export abstract class Visual implements Live {
  root: HTMLDivElement;
  protected dead = false;
  private clip: Box | null = null;
  private lastClip = "";

  constructor(
    protected engine: SwarmEngine,
    protected task: Task | null,
    color: string,
  ) {
    this.root = div("v", engine.overlayLayer());
    this.root.style.setProperty("--c", color);
    engine.live.add(this);
    task?.visuals.add(this);
  }

  measure() {
    this.clip = this.task ? this.engine.clipFor(this.task) : null;
    this.read();
  }

  apply() {
    let clip = "";
    if (this.clip) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const c = this.clip;
      clip = `inset(${c.y}px ${W - c.x - c.w}px ${H - c.y - c.h}px ${c.x}px)`;
    }
    if (clip !== this.lastClip) {
      this.root.style.clipPath = clip;
      this.lastClip = clip;
    }
    this.write();
  }

  protected abstract read(): void;
  protected abstract write(): void;

  fadeOut(ms = 380, delay = 0) {
    if (this.dead) return;
    const anim = this.root.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: this.engine.ms(ms),
      delay: this.engine.ms(delay),
      fill: "forwards",
      easing: "ease-out",
    });
    anim.onfinish = () => this.destroy();
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.root.remove();
    this.engine.live.delete(this);
    this.task?.visuals.delete(this);
  }
}

export interface SelectionOptions {
  badge?: boolean;
  placeholder?: boolean;
  handles?: boolean;
  radius?: string;
  className?: string;
}

/**
 * A design-tool selection: drawn from an anchor to the cursor while dragging,
 * then pinned to the element's live rect with handles and a W × H badge.
 */
export class Selection extends Visual {
  private frame: HTMLDivElement;
  private ph: HTMLDivElement | null = null;
  private badge: HTMLDivElement | null = null;
  private handles: HTMLDivElement[] = [];
  private anchor: (() => Point | null) | null = null;
  private agent: Agent | null = null;
  private rect: (() => Box | null) | null = null;
  private b: Box | null = null;
  private badgeText = "";
  private pinned = false;

  constructor(engine: SwarmEngine, task: Task | null, color: string, o: SelectionOptions = {}) {
    super(engine, task, color);
    if (o.placeholder) {
      this.ph = div("a ph", this.root);
      if (o.radius) this.ph.style.borderRadius = o.radius;
    }
    this.frame = div(`a ${o.className ?? "sel"}`, this.root);
    if (o.handles !== false) {
      for (let i = 0; i < 4; i++) {
        const h = div("a h", this.root);
        h.style.display = "none";
        this.handles.push(h);
      }
    }
    if (o.badge) this.badge = div("a badge", this.root);
  }

  drag(anchor: () => Point | null, agent: Agent) {
    this.anchor = anchor;
    this.agent = agent;
    this.rect = null;
    return this;
  }

  pin(rect: () => Box | null) {
    this.rect = rect;
    this.pinned = true;
    return this;
  }

  protected read() {
    if (this.rect) this.b = this.rect();
    else if (this.anchor && this.agent) {
      const a = this.anchor();
      this.b = a ? boxFrom(a, this.agent.pos) : null;
    }
  }

  protected write() {
    const b = this.b;
    if (!b) {
      this.root.style.display = "none";
      return;
    }
    this.root.style.display = "";
    place(this.frame, b);
    if (this.ph) place(this.ph, b);
    if (this.pinned && this.handles.length) {
      const pts = [
        [b.x, b.y],
        [b.x + b.w, b.y],
        [b.x, b.y + b.h],
        [b.x + b.w, b.y + b.h],
      ];
      this.handles.forEach((h, i) => {
        h.style.display = "";
        h.style.transform = `translate3d(${pts[i][0] - 3.5}px, ${pts[i][1] - 3.5}px, 0)`;
      });
    }
    if (this.badge) {
      const text = `${Math.round(b.w)} × ${Math.round(b.h)}`;
      if (text !== this.badgeText) {
        this.badge.textContent = text;
        this.badgeText = text;
      }
      const below = b.y + b.h + 7;
      const y = below + 18 > window.innerHeight ? b.y + b.h - 22 : below;
      this.badge.style.transform = `translate3d(${b.x + b.w / 2}px, ${y}px, 0) translateX(-50%)`;
    }
  }

  /** Placeholder fades while the real element fades in underneath. */
  fadePlaceholder(ms: number) {
    this.ph?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: this.engine.ms(ms),
      fill: "forwards",
      easing: "ease-out",
    });
  }

  /** Placeholder wipes away top to bottom (used for images and media). */
  sweepPlaceholder(ms: number) {
    this.ph?.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(100% 0 0 0)" }], {
      duration: this.engine.ms(ms),
      fill: "forwards",
      easing: "cubic-bezier(.3,.7,.2,1)",
    });
  }
}

/** Blinking text caret. */
export class Caret extends Visual {
  private el: HTMLDivElement;
  private r: Box | null = null;
  private last: Box | null = null;
  private typing = false;
  private source: (() => Box | null) | null = null;

  constructor(engine: SwarmEngine, task: Task, color: string) {
    super(engine, task, color);
    this.el = div("a caret blink", this.root);
  }

  follow(source: () => Box | null) {
    this.source = source;
  }

  setTyping(on: boolean) {
    if (on === this.typing) return;
    this.typing = on;
    this.el.classList.toggle("blink", !on);
  }

  protected read() {
    const r = this.source?.() ?? null;
    if (r && r.h > 0) this.last = r;
    this.r = this.last;
  }

  protected write() {
    const r = this.r;
    if (!r) {
      this.el.style.display = "none";
      return;
    }
    this.el.style.display = "";
    this.el.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
    this.el.style.height = `${r.h}px`;
  }
}

/** Pen tool stroke: anchor point, rubber band to the cursor, then a pinned segment. */
export class PenLine extends Visual {
  private svg: SVGSVGElement;
  private line: SVGLineElement;
  private dots: SVGRectElement[];
  private a: Point | null = null;
  private b: Point | null = null;
  private pinned = false;

  constructor(
    engine: SwarmEngine,
    task: Task,
    color: string,
    private from: () => Point | null,
    private to: () => Point | null,
  ) {
    super(engine, task, color);
    const ns = "http://www.w3.org/2000/svg";
    this.svg = document.createElementNS(ns, "svg") as SVGSVGElement;
    this.svg.setAttribute("class", "pen");
    this.line = document.createElementNS(ns, "line") as SVGLineElement;
    this.line.setAttribute("stroke", color);
    this.line.setAttribute("stroke-width", "1.5");
    this.svg.appendChild(this.line);
    this.dots = [0, 1].map(() => {
      const r = document.createElementNS(ns, "rect") as SVGRectElement;
      r.setAttribute("width", "6");
      r.setAttribute("height", "6");
      r.setAttribute("fill", "#fff");
      r.setAttribute("stroke", color);
      r.setAttribute("stroke-width", "1.2");
      this.svg.appendChild(r);
      return r;
    });
    this.root.appendChild(this.svg);
  }

  pinEnd(to: () => Point | null) {
    this.to = to;
    this.pinned = true;
  }

  protected read() {
    this.a = this.from();
    this.b = this.to();
  }

  protected write() {
    const { a, b } = this;
    if (!a || !b) return;
    this.line.setAttribute("x1", String(a.x));
    this.line.setAttribute("y1", String(a.y));
    this.line.setAttribute("x2", String(b.x));
    this.line.setAttribute("y2", String(b.y));
    this.dots[0].setAttribute("x", String(a.x - 3));
    this.dots[0].setAttribute("y", String(a.y - 3));
    this.dots[1].style.display = this.pinned ? "" : "none";
    this.dots[1].setAttribute("x", String(b.x - 3));
    this.dots[1].setAttribute("y", String(b.y - 3));
  }
}

/** Dashed copy outline that travels with the cursor during an ⌥-drag. */
export class Ghost extends Visual {
  private el: HTMLDivElement;
  private b: Box | null = null;

  constructor(
    engine: SwarmEngine,
    task: Task,
    color: string,
    public rect: () => Box | null,
    radius?: string,
  ) {
    super(engine, task, color);
    this.el = div("a ghost", this.root);
    if (radius) this.el.style.borderRadius = radius;
  }

  protected read() {
    this.b = this.rect();
  }

  protected write() {
    if (!this.b) {
      this.root.style.display = "none";
      return;
    }
    this.root.style.display = "";
    place(this.el, this.b);
  }
}

/** Red spacing measurement between two boxes, like holding ⌥ in a design tool. */
export class Measure extends Visual {
  private line: HTMLDivElement;
  private label: HTMLDivElement;
  private seg: { x: number; y: number; w: number; h: number; gap: number } | null = null;
  private text = "";

  constructor(
    engine: SwarmEngine,
    task: Task,
    private a: () => Box | null,
    private b: () => Box | null,
  ) {
    super(engine, task, MEASURE);
    this.line = div("a mline", this.root);
    this.label = div("a badge mlabel", this.root);
  }

  protected read() {
    const a = this.a();
    const b = this.b();
    this.seg = null;
    if (!a || !b) return;
    const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const midY = overlapY > 0 ? Math.max(a.y, b.y) + overlapY / 2 : b.y + b.h / 2;
    const midX = overlapX > 0 ? Math.max(a.x, b.x) + overlapX / 2 : b.x + b.w / 2;
    if (b.x >= a.x + a.w) this.seg = { x: a.x + a.w, y: midY, w: b.x - a.x - a.w, h: 1, gap: b.x - a.x - a.w };
    else if (b.x + b.w <= a.x) this.seg = { x: b.x + b.w, y: midY, w: a.x - b.x - b.w, h: 1, gap: a.x - b.x - b.w };
    else if (b.y >= a.y + a.h) this.seg = { x: midX, y: a.y + a.h, w: 1, h: b.y - a.y - a.h, gap: b.y - a.y - a.h };
    else if (b.y + b.h <= a.y) this.seg = { x: midX, y: b.y + b.h, w: 1, h: a.y - b.y - b.h, gap: a.y - b.y - b.h };
  }

  protected write() {
    const s = this.seg;
    if (!s || s.gap < 2) {
      this.root.style.display = "none";
      return;
    }
    this.root.style.display = "";
    place(this.line, s);
    const text = String(Math.round(s.gap));
    if (text !== this.text) {
      this.label.textContent = text;
      this.text = text;
    }
    this.label.style.transform = `translate3d(${s.x + s.w / 2}px, ${s.y + s.h / 2}px, 0) translate(-50%, -50%)`;
  }
}
