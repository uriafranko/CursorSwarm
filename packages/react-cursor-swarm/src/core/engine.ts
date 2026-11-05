import { Agent } from "./agent";
import { stepBoid } from "./flock";
import { Overlay } from "./overlay";
import { HIDE_ATTR, STILL_ATTR } from "./root";
import type { SwarmRoot } from "./root";
import type { Detail } from "./scan";
import { runScript } from "./scripts";
import type { Task } from "./task";
import { HIGHLIGHT_NAME } from "./text";
import { CancelledError, clamp, inflate, intersect, isBrowser, rand, shuffle, toBox, viewport } from "./util";
import type { Box, Point, Token } from "./util";

/** What idle cursors do once there is nothing on screen left to build. */
export type Finale = "leave" | "flock";

export interface FlockOptions {
  /** Distance the cursors orbit at around the pointer, px. Default 110. */
  radius?: number;
  /** The pointer gets this close and cursors scatter, px. Default 80. */
  fleeRadius?: number;
  /** How long the flock hangs around before flying off, ms. Default: until the next build or `dismiss()`. */
  duration?: number;
  /** Top the flock up to this many cursors. Default: the `agents` limit. */
  size?: number;
  /**
   * Average speed along the orbit, px/s. Each cursor gets its own pace around it. Default 260.
   * Not affected by the engine's `speed`: the flock always moves at 1×.
   */
  speed?: number;
  /**
   * How restless the flock is, 0…1. At 0 cursors ride steady circles; higher values add more
   * surges, lane changes and U-turns. Default 0.6.
   */
  randomness?: number;
}

export interface SwarmOptions {
  /** Most cursors on screen at once. More join as more work becomes available. Default 8. */
  agents?: number;
  /** Build speed multiplier. Default 1. The flock finale ignores it and always moves at 1×. */
  speed?: number;
  /** Show a name tag next to each cursor. Default true. */
  labels?: boolean;
  names?: string[];
  colors?: string[];
  /**
   * Default `detail` for every component built by this engine. A component's own `detail` wins.
   * - `full` (default): boxes, media, lines, typed text and ⌥-drag duplicates
   * - `boxes`: no typing; text appears with its container
   * - `outline`: one selection drag around the whole component, then it fades in
   */
  detail?: Detail;
  /** Skip the animation for users who prefer reduced motion. Default true. */
  respectReducedMotion?: boolean;
  /** z-index of the cursor overlay. Default 2147483000. */
  zIndex?: number;
  /**
   * What cursors do when they run out of work.
   * - `leave` (default): fly off the screen edge
   * - `flock`: gather around the user's pointer and orbit it, scattering when it comes close
   */
  finale?: Finale;
  flock?: FlockOptions;
}

export interface SwarmStats {
  /** Cursors currently on screen. */
  agents: number;
  /** Layers built so far, across all components currently building. */
  done: number;
  total: number;
  /** Components currently building. */
  building: number;
  /** Agent colors and names, for avatars. */
  team: { name: string; color: string }[];
  /** Cursors are orbiting the pointer. */
  flocking: boolean;
}

/** Anything re-laid out every frame (cursors, selections, carets...). */
export interface Live {
  measure?: () => void;
  apply: () => void;
}

interface Anim {
  start: number;
  dur: number;
  token: Token;
  fn?: (k: number) => void;
  resolve: () => void;
  reject: (e: unknown) => void;
}

export const DEFAULT_COLORS = [
  "#F24E1E",
  "#0D99FF",
  "#14AE5C",
  "#9747FF",
  "#FFA629",
  "#FF24BD",
  "#0FA9A0",
  "#5551FF",
  "#E5484D",
  "#8DB600",
];
export const DEFAULT_NAMES = [
  "Ada",
  "Linus",
  "Grace",
  "Alan",
  "Hedy",
  "Ken",
  "Radia",
  "Guido",
  "Barbara",
  "Dennis",
  "Frances",
  "Tim",
  "Joan",
  "Bjarne",
];

const GLOBAL_CSS = `
[${HIDE_ATTR}] { visibility: hidden !important; }
[${STILL_ATTR}], [${STILL_ATTR}] * { transition: none !important; }
::highlight(${HIGHLIGHT_NAME}) {
  color: transparent;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  text-decoration-color: transparent;
}
`;

let cssInjected = false;
const injectGlobalCss = () => {
  if (cssInjected || !isBrowser) {
    return;
  }
  cssInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-swarm-styles", "");
  style.textContent = GLOBAL_CSS;
  document.head.append(style);
};

const defaults = (o: SwarmOptions): Required<SwarmOptions> => ({
  agents: o.agents ?? 8,
  colors: o.colors?.length ? o.colors : DEFAULT_COLORS,
  detail: o.detail ?? "full",
  finale: o.finale ?? "leave",
  flock: o.flock ?? {},
  labels: o.labels ?? true,
  names: o.names?.length ? o.names : DEFAULT_NAMES,
  respectReducedMotion: o.respectReducedMotion ?? true,
  speed: o.speed ?? 1,
  zIndex: o.zIndex ?? 2_147_483_000,
});

const LINGER = 1300;

/**
 * Framework-agnostic core. One engine owns one overlay and one pool of cursors that is
 * shared by every component it builds, so cursors hop between components on screen.
 */
/** Index of the task to take next: top-down first, then whatever is closest to (x, y). */
const pickBest = (x: number, y: number, list: { task: Task; box: Box }[]) => {
  let bi = 0;
  let bs = Infinity;
  for (const [i, { box }] of list.entries()) {
    const d = Math.hypot(box.x - x, box.y - y);
    const s = Math.max(0, box.y) + d * 0.5 + Math.random() * 30;
    if (s < bs) {
      bs = s;
      bi = i;
    }
  }
  return bi;
};

export class SwarmEngine {
  options: Required<SwarmOptions>;
  /** Engine clock in ms, scaled by `speed`. */
  time = 0;
  /** Wall clock in ms. The flock runs on this, so it moves at the same pace whatever `speed` is. */
  realTime = 0;
  readonly live = new Set<Live>();
  agents: Agent[] = [];

  private overlay: Overlay | null = null;
  private roots = new Set<SwarmRoot>();
  private registered = new Set<SwarmRoot>();
  private anims: Anim[] = [];
  private raf = 0;
  private last = 0;
  private nextSchedule = 0;
  private lastSpawn = -Infinity;
  private seq = 0;
  private names: string[];
  private rects = new Map<Element, Box>();
  private textRects = new Map<Task, Box | null>();
  private clips = new Map<Task, Box | null>();
  private listeners = new Set<() => void>();
  private stats: SwarmStats = { agents: 0, building: 0, done: 0, flocking: false, team: [], total: 0 };
  private statsDirty = false;
  private pointer: Point | null = null;
  private pointerVel: Point = { x: 0, y: 0 };
  private pointerAt = 0;
  private listening = false;
  private forcedFlock = false;
  private dismissed = false;
  private flockSince: number | null = null;

  constructor(options: SwarmOptions = {}) {
    this.options = defaults(options);
    this.names = shuffle(this.options.names);
  }

  setOptions(options: SwarmOptions) {
    const prev = this.options;
    const next = defaults(options);
    this.options = next;
    if (prev.names.join("\u0000") !== next.names.join("\u0000")) {
      this.names = shuffle(next.names);
    }
    if (prev.zIndex !== next.zIndex) {
      this.overlay?.setZIndex(next.zIndex);
    }
    if (next.finale === "flock" && this.roots.size) {
      this.listenPointer();
    }
    if (prev.agents !== next.agents) {
      this.rescheduleNow();
    }
  }

  setSpeed(speed: number) {
    this.options = { ...this.options, speed };
  }

  /**
   * Change the cursor limit live. Raising it lets more cursors join while there's work;
   * lowering it sends the extra ones away (busy cursors finish their current layer first).
   */
  setAgents(agents: number) {
    this.options = { ...this.options, agents };
    this.rescheduleNow();
  }

  get speed() {
    return clamp(this.options.speed, 0.05, 20);
  }

  /** The `agents` option as a whole number, at least 1. */
  get maxAgents() {
    return Math.max(1, Math.round(this.options.agents) || 1);
  }

  private rescheduleNow() {
    this.nextSchedule = 0;
    if (this.agents.length || this.roots.size) {
      this.kick();
    }
  }

  /** Convert a 1×-speed duration to real milliseconds (for CSS / Web Animations). */
  ms(n: number) {
    return n / this.speed;
  }

  reducedMotion(): boolean {
    return (
      this.options.respectReducedMotion &&
      isBrowser &&
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  // ---- overlay -------------------------------------------------------------

  /** Add the page-wide rules (hiding, transition freeze, text highlight) if they aren't there yet. */
  // oxlint-disable-next-line class-methods-use-this -- engine API; callers needn't know the styles are page-global
  ensureStyles() {
    injectGlobalCss();
  }

  private ensureOverlay(): Overlay {
    if (!this.overlay) {
      injectGlobalCss();
      this.overlay = new Overlay(this.options.zIndex);
    }
    return this.overlay;
  }

  overlayLayer(): HTMLDivElement {
    return this.ensureOverlay().visuals;
  }

  overlayAgents(): HTMLDivElement {
    return this.ensureOverlay().agents;
  }

  // ---- clock ---------------------------------------------------------------

  /** Run `fn(k)` every frame for `dur` engine-ms (k goes 0→1); resolves at the end, rejects if cancelled. */
  animate(dur: number, token: Token, fn?: (k: number) => void): Promise<void> {
    if (token.cancelled) {
      return Promise.reject(new CancelledError());
    }
    // oxlint-disable-next-line promise/avoid-new -- settled by the frame loop, not by a callback API
    return new Promise((resolve, reject) => {
      this.anims.push({ dur, fn, reject, resolve, start: this.time, token });
      this.kick();
    });
  }

  wait(ms: number, token: Token) {
    return this.animate(ms, token);
  }

  private kick() {
    if (this.raf || !isBrowser) {
      return;
    }
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    const dt = clamp(now - this.last, 0, 50);
    this.last = now;
    this.time += dt * this.speed;
    this.realTime += dt;
    this.rects.clear();
    this.textRects.clear();
    this.clips.clear();

    if (this.anims.length) {
      const list = this.anims;
      this.anims = [];
      for (const a of list) {
        if (a.token.cancelled) {
          a.reject(new CancelledError());
          continue;
        }
        const k = a.dur <= 0 ? 1 : Math.min(1, (this.time - a.start) / a.dur);
        try {
          a.fn?.(k);
        } catch (error) {
          a.reject(error);
          continue;
        }
        if (k >= 1) {
          a.resolve();
        } else {
          this.anims.push(a);
        }
      }
    }

    // `speed` is for building. The flock always moves at 1×.
    this.stepFlock(dt / 1000);
    this.schedule(now);
    for (const l of this.live) {
      l.measure?.();
    }
    for (const l of this.live) {
      l.apply();
    }
    this.flushStats();

    if (this.anims.length || this.agents.length || this.roots.size || this.live.size) {
      this.raf = requestAnimationFrame(this.tick);
    }
  };

  // ---- geometry (cached per frame) -----------------------------------------

  box(el: Element): Box | null {
    let b = this.rects.get(el);
    if (!b) {
      if (!el.isConnected) {
        return null;
      }
      b = toBox(el.getBoundingClientRect());
      this.rects.set(el, b);
    }
    return b;
  }

  textBox(task: Task): Box | null {
    const cached = this.textRects.get(task);
    if (cached !== undefined) {
      return cached;
    }
    const b = task.layer.text?.rect() ?? null;
    this.textRects.set(task, b);
    return b;
  }

  /** Visible region of a task after its clipping ancestors (scroll containers, overflow: hidden). */
  clipFor(task: Task): Box | null {
    if (!task.clipEls.length) {
      return null;
    }
    const cached = this.clips.get(task);
    if (cached) {
      return cached;
    }
    let c: Box | null = viewport();
    for (const el of task.clipEls) {
      const b = this.box(el);
      if (!b) {
        continue;
      }
      c &&= intersect(c, b);
    }
    const out = c ?? { h: 0, w: 0, x: 0, y: 0 };
    this.clips.set(task, out);
    return out;
  }

  private targetBox(task: Task): Box | null {
    return task.kind === "text" ? this.textBox(task) : this.box(task.el);
  }

  private onScreen(task: Task): Box | null {
    const b = this.targetBox(task);
    if (!b) {
      return null;
    }
    let r = intersect(b, inflate(viewport(), 24));
    if (!r) {
      return null;
    }
    const c = this.clipFor(task);
    if (c) {
      r = intersect(r, inflate(c, 24));
    }
    return r ? b : null;
  }

  // ---- roots ---------------------------------------------------------------

  register(root: SwarmRoot) {
    this.registered.add(root);
  }

  unregister(root: SwarmRoot) {
    this.registered.delete(root);
  }

  attach(root: SwarmRoot) {
    this.ensureOverlay();
    if (this.options.finale === "flock") {
      this.listenPointer();
    }
    this.roots.add(root);
    this.markStats();
    this.kick();
  }

  detach(root: SwarmRoot) {
    if (this.roots.delete(root)) {
      this.markStats();
    }
  }

  /** Rebuild every component that has already been built (or is building). */
  replayAll() {
    for (const r of this.registered) {
      if (r.state !== "idle") {
        r.start();
      }
    }
  }

  /** Finish every build immediately. */
  revealAll() {
    for (const r of [...this.roots]) {
      r.reveal();
    }
  }

  /** Gather the cursors around the pointer now, even if `finale` is `leave`. */
  flock() {
    if (this.reducedMotion()) {
      return;
    }
    this.forcedFlock = true;
    this.dismissed = false;
    this.nextSchedule = 0;
    this.listenPointer();
    this.kick();
  }

  /** Send every cursor that isn't busy off screen and stop flocking until the next build. */
  dismiss() {
    this.forcedFlock = false;
    this.dismissed = true;
    this.flockSince = null;
    for (const a of [...this.agents]) {
      if (a.state === "idle" || a.state === "flocking") {
        a.leave();
      }
    }
  }

  /** True while cursors are orbiting the pointer. */
  get flocking() {
    return this.agents.some((a) => a.state === "flocking");
  }

  runScript(agent: Agent, task: Task) {
    return runScript(agent, task, this);
  }

  // ---- scheduling ----------------------------------------------------------

  // oxlint-disable-next-line complexity -- the per-frame scheduler; its steps read top to bottom
  private schedule(now: number) {
    if (now < this.nextSchedule) {
      return;
    }
    this.nextSchedule = now + 80;

    const ready: { task: Task; box: Box }[] = [];
    for (const root of this.roots) {
      for (const task of root.tasks) {
        if (task.state !== "waiting" || !task.depsDone()) {
          continue;
        }
        if (!task.alive()) {
          task.skip();
          continue;
        }
        const box = this.onScreen(task);
        if (!box) {
          continue;
        }
        if (box.w * box.h === 0 && task.kind !== "line") {
          task.skip();
          continue;
        }
        ready.push({ box, task });
      }
    }

    // Flocking cursors drop out of the flock the moment there is work.
    const free = this.agents.filter((a) => a.state === "idle" || a.state === "flocking");
    if (ready.length) {
      this.dismissed = false;
      this.flockSince = null;
    }
    const flockOn = !this.dismissed && (this.forcedFlock || this.options.finale === "flock") && !this.reducedMotion();

    // The limit can be lowered at runtime: cursors over it leave as soon as they're free,
    // newest first. A flock is allowed to grow to `flock.size` even if that's bigger.
    let active = this.agents.filter((a) => a.state !== "leaving").length;
    const cap = flockOn ? Math.max(this.maxAgents, this.flockSize) : this.maxAgents;
    while (active > cap) {
      const extra = free.pop();
      if (!extra) {
        break;
      }
      extra.leave();
      active -= 1;
    }

    while (ready.length) {
      const agent = free.shift();
      if (!agent) {
        break;
      }
      const [next] = ready.splice(pickBest(agent.x, agent.y, ready), 1);
      agent.run(next.task);
    }

    if (ready.length && active < this.maxAgents && now - this.lastSpawn > 70) {
      this.lastSpawn = now;
      const [pick] = ready.splice(pickBest(window.innerWidth / 2, 0, ready), 1);
      this.spawn(pick.box).run(pick.task);
    }

    if (flockOn) {
      this.scheduleFlock(now, free, active);
    } else {
      for (const a of free) {
        if (a.state === "flocking" || this.time - a.idleSince > LINGER) {
          a.leave();
        } else if (this.time - a.idleSince > 250) {
          a.wander();
        }
      }
    }
  }

  private get flockSize() {
    return this.options.flock.size ?? this.maxAgents;
  }

  private scheduleFlock(now: number, free: Agent[], active: number) {
    const { radius = 110, speed = 260, duration = Infinity } = this.options.flock;
    const size = this.flockSize;
    const orbit = { radius, speed };
    for (const a of free) {
      if (a.state === "idle" && this.time - a.idleSince > 160) {
        a.startFlock(orbit);
      }
    }

    const flockers = this.agents.filter((a) => a.state === "flocking");
    // The automatic finale only forms once cursors have actually run out of work; flock() can start from zero.
    if (!flockers.length && !this.forcedFlock) {
      return;
    }
    this.listenPointer();
    if (this.flockSince === null) {
      this.flockSince = this.realTime;
    }
    if (this.realTime - this.flockSince > duration) {
      this.dismiss();
      return;
    }
    // Everyone's done: let a few more cursors join the party, one at a time.
    const working = this.agents.some((a) => a.state === "busy");
    if (!working && active < size && now - this.lastSpawn > 100) {
      this.lastSpawn = now;
      const p = this.pointer ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      this.spawn({ h: 0, w: 0, x: p.x, y: p.y }).startFlock(orbit);
    }
  }

  // ---- flocking ------------------------------------------------------------

  private stepFlock(dt: number) {
    const flock = [];
    for (const a of this.agents) {
      if (a.state === "flocking" && a.boid) {
        flock.push(a.boid);
      }
    }
    if (!flock.length || dt <= 0) {
      return;
    }
    const center = this.pointer ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    // The pointer's velocity decays when it stops moving (pointermove only fires on motion).
    const still = performance.now() - this.pointerAt > 80;
    const vel = still ? { x: 0, y: 0 } : this.pointerVel;
    const { fleeRadius = 80, randomness = 0.6 } = this.options.flock;
    const params = { fleeRadius, randomness, time: this.realTime / 1000 };
    const step = Math.min(dt, 1 / 30);
    for (const a of this.agents) {
      if (a.state !== "flocking" || !a.boid) {
        continue;
      }
      stepBoid(a.boid, center, vel, flock, params, step);
      a.x = a.boid.x;
      a.y = a.boid.y;
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    const t = performance.now();
    if (this.pointer) {
      const dt = Math.max(1, t - this.pointerAt) / 1000;
      const k = 0.35;
      this.pointerVel = {
        x: this.pointerVel.x * (1 - k) + ((e.clientX - this.pointer.x) / dt) * k,
        y: this.pointerVel.y * (1 - k) + ((e.clientY - this.pointer.y) / dt) * k,
      };
    }
    this.pointer = { x: e.clientX, y: e.clientY };
    this.pointerAt = t;
  };

  private onPointerOut = (e: PointerEvent) => {
    if (!e.relatedTarget) {
      this.pointerVel = { x: 0, y: 0 };
    }
  };

  private listenPointer() {
    if (this.listening || !isBrowser) {
      return;
    }
    this.listening = true;
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerout", this.onPointerOut, { passive: true });
  }

  private unlistenPointer() {
    if (!this.listening) {
      return;
    }
    this.listening = false;
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerout", this.onPointerOut);
  }

  private spawn(target: Box): Agent {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cx = clamp(target.x + Math.min(target.w, 40), 0, W);
    const cy = clamp(target.y + Math.min(target.h, 40), 0, H);
    const edges = [
      { d: cx, p: { x: -30, y: cy + rand(-180, 180) } },
      { d: W - cx, p: { x: W + 30, y: cy + rand(-180, 180) } },
      { d: cy, p: { x: cx + rand(-220, 220), y: -30 } },
      { d: H - cy, p: { x: cx + rand(-220, 220), y: H + 30 } },
    ].sort((a, b) => a.d - b.d);
    const from = edges[Math.random() < 0.65 ? 0 : 1].p;
    this.seq += 1;
    const n = this.seq;
    const agent = new Agent(
      this,
      this.options.colors[n % this.options.colors.length],
      this.names[n % this.names.length],
      from
    );
    this.agents.push(agent);
    this.markStats();
    return agent;
  }

  removeAgent(agent: Agent) {
    const i = this.agents.indexOf(agent);
    if (i !== -1) {
      this.agents.splice(i, 1);
      this.markStats();
    }
  }

  // ---- stats ---------------------------------------------------------------

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getStats = (): SwarmStats => this.stats;

  markStats() {
    this.statsDirty = true;
    if (!this.raf) {
      queueMicrotask(() => this.flushStats());
    }
  }

  private flushStats() {
    if (!this.statsDirty) {
      return;
    }
    this.statsDirty = false;
    let done = 0;
    let total = 0;
    for (const r of this.roots) {
      total += r.tasks.length;
      for (const t of r.tasks) {
        if (t.state === "done") {
          done += 1;
        }
      }
    }
    const team = this.agents.filter((a) => a.state !== "leaving").map((a) => ({ color: a.color, name: a.name }));
    const flocking = this.agents.some((a) => a.state === "flocking");
    this.stats = { agents: team.length, building: this.roots.size, done, flocking, team, total };
    for (const fn of this.listeners) {
      fn();
    }
  }

  // ---- teardown ------------------------------------------------------------

  /** Restore every component, remove all cursors and the overlay. The engine can be used again afterwards. */
  dispose() {
    for (const r of [...this.registered]) {
      r.reset();
    }
    for (const a of [...this.agents]) {
      a.destroy();
    }
    const { anims } = this;
    this.anims = [];
    for (const a of anims) {
      a.reject(new CancelledError());
    }
    for (const l of [...this.live]) {
      (l as { destroy?: () => void }).destroy?.();
    }
    this.live.clear();
    if (this.raf) {
      cancelAnimationFrame(this.raf);
    }
    this.raf = 0;
    this.unlistenPointer();
    this.forcedFlock = false;
    this.dismissed = false;
    this.flockSince = null;
    this.overlay?.destroy();
    this.overlay = null;
    this.markStats();
  }
}

let defaultEngine: SwarmEngine | null = null;

/** Engine used by components rendered outside a <SwarmProvider>. */
export const getDefaultEngine = (): SwarmEngine => {
  if (!defaultEngine) {
    defaultEngine = new SwarmEngine();
  }
  return defaultEngine;
};
