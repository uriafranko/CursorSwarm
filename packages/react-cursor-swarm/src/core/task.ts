import type { Agent } from "./agent";
import type { Layer, LayerKind } from "./scan";
import type { SwarmRoot } from "./root";
import type { Token } from "./util";

export type RevealEffect = "fade" | "sweep" | "none";

export class Task {
  state: "waiting" | "active" | "done" = "waiting";
  deps: Task[] = [];
  token: Token = { cancelled: false };
  visuals = new Set<{ destroy(): void }>();
  agent: Agent | null = null;

  constructor(
    readonly root: SwarmRoot,
    readonly layer: Layer,
    /** Ancestors that clip this element (overflow: hidden / scroll containers). */
    readonly clipEls: Element[],
  ) {}

  get kind(): LayerKind {
    return this.layer.kind;
  }

  get el(): Element {
    return this.layer.el;
  }

  depsDone() {
    for (const d of this.deps) if (d.state !== "done") return false;
    return true;
  }

  alive() {
    if (!this.el.isConnected) return false;
    if (this.layer.text && !this.layer.text.valid()) return false;
    return true;
  }

  reveal(effect: RevealEffect = "fade") {
    if (this.layer.text) this.layer.text.release();
    else this.root.unhide(this.el, effect);
  }

  complete() {
    if (this.state === "done") return;
    this.state = "done";
    this.root.taskDone();
  }

  /** Give up on animating this one (element vanished, script error): just show it. */
  skip() {
    this.reveal("fade");
    this.complete();
  }

  cancel() {
    this.token.cancelled = true;
    for (const v of Array.from(this.visuals)) v.destroy();
  }
}
