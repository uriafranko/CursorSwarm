import { cursorMarkup, HOTSPOT, type CursorMode } from "./cursors";
import type { Live, SwarmEngine } from "./engine";
import { makeBoid, type Boid, type BoidOptions } from "./flock";
import { div } from "./overlay";
import type { Task } from "./task";
import {
  Cancelled,
  clamp,
  easeInCubic,
  easeInOutQuad,
  easeReach,
  rand,
  type Ease,
  type Point,
  type Token,
} from "./util";

export type Target = Point | (() => Point | null);

export interface MoveOptions {
  /** Duration in ms (at 1× speed). Defaults to a distance-based, Fitts-ish duration. */
  dur?: number;
  ease?: Ease;
  /** Sideways bow of the path, as a fraction of its length. */
  bend?: number;
  /** Called once when the move is ~75% done (e.g. to switch cursor before arriving). */
  near?: () => void;
}

export type AgentState = "idle" | "busy" | "flocking" | "leaving";

/** One multiplayer cursor. */
export class Agent implements Live {
  x: number;
  y: number;
  state: AgentState = "idle";
  idleSince: number;
  mode: CursorMode = "arrow";
  down = false;
  task: Task | null = null;
  /** Physics state while flocking around the pointer. */
  boid: Boid | null = null;

  private el: HTMLDivElement;
  private svg: SVGSVGElement;
  private shownMode: CursorMode | null = null;
  private shownDown = false;
  private wanderTok: Token | null = null;
  private dead = false;

  constructor(
    private engine: SwarmEngine,
    readonly color: string,
    readonly name: string,
    start: Point,
  ) {
    this.x = start.x;
    this.y = start.y;
    this.idleSince = engine.time;
    this.el = div("agent", engine.overlayAgents());
    this.el.style.setProperty("--c", color);
    this.el.style.color = color;
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
    this.svg.setAttribute("viewBox", "0 0 24 24");
    this.el.appendChild(this.svg);
    if (engine.options.labels) {
      const label = div("name", this.el);
      label.textContent = name;
    }
    this.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
    engine.live.add(this);
    this.apply();
  }

  get pos(): Point {
    return { x: this.x, y: this.y };
  }

  setMode(mode: CursorMode) {
    this.mode = mode;
  }

  moveTo(target: Target, token: Token, o: MoveOptions = {}): Promise<void> {
    const fx = this.x;
    const fy = this.y;
    const resolve = typeof target === "function" ? target : () => target;
    let last = resolve() ?? { x: fx, y: fy };
    const dist = Math.hypot(last.x - fx, last.y - fy);
    const dur = o.dur ?? (dist < 1 ? 0 : 200 + Math.sqrt(dist) * 21);
    const bend = o.bend ?? rand(-0.16, 0.16);
    const ease = o.ease ?? easeReach;
    let nearDone = !o.near;
    return this.engine.animate(dur, token, (k) => {
      const p = resolve();
      if (p) last = p;
      const e = ease(k);
      const dx = last.x - fx;
      const dy = last.y - fy;
      // Quadratic Bézier with a control point pushed off the straight line: hands move in arcs.
      const cx = fx + dx / 2 - dy * bend;
      const cy = fy + dy / 2 + dx * bend;
      const u = 1 - e;
      this.x = u * u * fx + 2 * u * e * cx + e * e * last.x;
      this.y = u * u * fy + 2 * u * e * cy + e * e * last.y;
      if (!nearDone && k >= 0.75) {
        nearDone = true;
        o.near?.();
      }
    });
  }

  async press(token: Token, hold = 70) {
    this.down = true;
    await this.engine.wait(hold, token);
  }

  async release(token: Token, after = 40) {
    this.down = false;
    await this.engine.wait(after, token);
  }

  /** Small idle drift so waiting cursors feel alive. */
  wander() {
    if (this.wanderTok || this.state !== "idle") return;
    const tok: Token = { cancelled: false };
    this.wanderTok = tok;
    const p = {
      x: clamp(this.x + rand(-46, 46), 12, window.innerWidth - 12),
      y: clamp(this.y + rand(-34, 34), 12, window.innerHeight - 12),
    };
    this.moveTo(p, tok, { dur: rand(900, 1700), ease: easeInOutQuad, bend: rand(-0.35, 0.35) }).then(
      () => {
        if (this.wanderTok === tok) this.wanderTok = null;
      },
      () => {},
    );
  }

  stopWander() {
    if (this.wanderTok) {
      this.wanderTok.cancelled = true;
      this.wanderTok = null;
    }
  }

  async run(task: Task) {
    this.stopWander();
    this.stopFlock();
    this.state = "busy";
    this.task = task;
    task.state = "active";
    task.agent = this;
    try {
      await this.engine.runScript(this, task);
    } catch (e) {
      if (!(e instanceof Cancelled)) console.error("[react-cursor-swarm]", e);
    } finally {
      if (task.state === "active" && !task.token.cancelled) task.skip();
      task.agent = null;
      this.task = null;
      this.down = false;
      this.mode = "arrow";
      if (this.state === "busy") {
        this.state = "idle";
        this.idleSince = this.engine.time;
      }
    }
  }

  /** Join the flock orbiting the pointer. The engine integrates the physics each frame. */
  startFlock(orbit: BoidOptions) {
    if (this.state !== "idle") return;
    this.stopWander();
    this.state = "flocking";
    this.mode = "arrow";
    this.boid = makeBoid(this.x, this.y, orbit);
    this.engine.markStats();
  }

  stopFlock() {
    if (this.state !== "flocking") return;
    this.state = "idle";
    this.boid = null;
    this.idleSince = this.engine.time;
    this.engine.markStats();
  }

  /** Fly off the nearest screen edge, then disappear. */
  async leave() {
    if (this.state === "leaving") return;
    this.stopWander();
    this.stopFlock();
    this.state = "leaving";
    const W = window.innerWidth;
    const H = window.innerHeight;
    const exits = [
      { d: this.x, p: { x: -60, y: this.y + rand(-80, 80) } },
      { d: W - this.x, p: { x: W + 60, y: this.y + rand(-80, 80) } },
      { d: this.y, p: { x: this.x + rand(-80, 80), y: -60 } },
      { d: H - this.y, p: { x: this.x + rand(-80, 80), y: H + 60 } },
    ].sort((a, b) => a.d - b.d);
    const tok: Token = { cancelled: false };
    try {
      await this.moveTo(exits[0].p, tok, { dur: 520 + exits[0].d * 0.5, ease: easeInCubic });
    } catch {
      /* disposed */
    }
    this.destroy();
  }

  apply() {
    this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    if (this.mode !== this.shownMode) {
      this.svg.innerHTML = cursorMarkup(this.mode);
      const [hx, hy] = HOTSPOT[this.mode];
      this.svg.style.left = `${-hx}px`;
      this.svg.style.top = `${-hy}px`;
      this.svg.style.transformOrigin = `${hx}px ${hy}px`;
      this.shownMode = this.mode;
    }
    if (this.down !== this.shownDown) {
      this.el.classList.toggle("down", this.down);
      this.shownDown = this.down;
    }
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.stopWander();
    this.el.remove();
    this.engine.live.delete(this);
    this.engine.removeAgent(this);
  }
}
