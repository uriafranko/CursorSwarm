import type { SwarmEngine } from "./engine";
import { scan } from "./scan";
import type { Detail, Layer } from "./scan";
import { Task } from "./task";
import type { RevealEffect } from "./task";

export const HIDE_ATTR = "data-swarm-hide";

export interface RootOptions {
  /**
   * - `full`: boxes, media, lines, typed text and ⌥-drag duplicates
   * - `boxes`: boxes, media and lines; text appears with its container
   * - `outline`: one selection drag around the whole component, then it fades in
   *
   * Default: the engine's `detail` option (`full` unless set).
   */
  detail?: Detail;
  /** Detect repeated siblings and ⌥-drag copies of the first one. Default true. */
  duplicates?: boolean;
  /** Upper bound on animated layers; anything past it appears with its parent. Default 300. */
  maxLayers?: number;
  onStart?: () => void;
  onComplete?: () => void;
}

/** One wrapped component (or any DOM subtree) that the swarm builds. */
export class SwarmRoot {
  tasks: Task[] = [];
  state: "idle" | "building" | "done" = "idle";
  private hidden = new Set<Element>();
  private finishing = false;

  readonly engine: SwarmEngine;
  private getElements: () => Element[];
  public options: RootOptions;

  constructor(engine: SwarmEngine, getElements: () => Element[], options: RootOptions = {}) {
    this.engine = engine;
    this.getElements = getElements;
    this.options = options;
    engine.register(this);
  }

  /** Hide the component and queue its layers for the swarm. Call again to replay. */
  // oxlint-disable-next-line complexity -- one pass over the scan: hide, queue, wire dependencies
  start() {
    this.reset();
    const els = this.getElements().filter((e) => e.isConnected);
    if (!els.length || this.engine.reducedMotion()) {
      this.state = "done";
      this.options.onStart?.();
      this.options.onComplete?.();
      return;
    }
    const layers = scan(els, {
      detail: this.options.detail ?? this.engine.options.detail,
      duplicates: this.options.duplicates ?? true,
      maxLayers: this.options.maxLayers ?? 300,
    });

    const overflow = new Map<Element, boolean>();
    const clips = (el: Element): Element[] => {
      const out: Element[] = [];
      for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
        let clipped = overflow.get(e);
        if (clipped === undefined) {
          const cs = getComputedStyle(e);
          clipped = cs.overflowX !== "visible" || cs.overflowY !== "visible";
          overflow.set(e, clipped);
        }
        if (clipped && e !== document.body) {
          out.push(e);
        }
      }
      return out;
    };

    const byLayer = new Map<Layer, Task>();
    for (const l of layers) {
      const t = new Task(this, l, clips(l.el));
      byLayer.set(l, t);
      this.tasks.push(t);
    }
    for (const t of this.tasks) {
      const l = t.layer;
      if (l.parent) {
        const p = byLayer.get(l.parent);
        if (p) {
          t.deps.push(p);
        }
      }
      if (l.kind === "dup" && l.master) {
        // A copy can only be made once the original is completely built.
        for (const m of this.tasks) {
          if (m === t) {
            continue;
          }
          if (m.el === l.master || l.master.contains(m.el)) {
            t.deps.push(m);
          }
        }
      }
    }

    for (const t of this.tasks) {
      if (t.layer.text) {
        if (!t.layer.text.hide()) {
          t.complete();
        }
      } else {
        this.hide(t.el);
      }
    }

    this.state = "building";
    this.engine.attach(this);
    this.options.onStart?.();
    if (this.tasks.every((t) => t.state === "done")) {
      this.finish();
    }
  }

  hide(el: Element) {
    el.setAttribute(HIDE_ATTR, "");
    this.hidden.add(el);
  }

  unhide(el: Element, effect: RevealEffect = "none") {
    if (!this.hidden.has(el)) {
      return;
    }
    this.hidden.delete(el);
    el.removeAttribute(HIDE_ATTR);
    if (effect === "none" || typeof (el as HTMLElement).animate !== "function") {
      return;
    }
    const ms = this.engine.ms(effect === "sweep" ? 560 : 300);
    if (effect === "sweep") {
      el.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }], {
        duration: ms,
        easing: "cubic-bezier(.3,.7,.2,1)",
      });
    } else {
      const { opacity } = getComputedStyle(el);
      el.animate([{ opacity: 0 }, { opacity }], { duration: ms, easing: "ease-out" });
    }
  }

  taskDone() {
    this.engine.markStats();
    if (this.state !== "building" || this.finishing) {
      return;
    }
    if (this.tasks.every((t) => t.state === "done")) {
      this.finishing = true;
      queueMicrotask(() => {
        this.finishing = false;
        if (this.state === "building" && this.tasks.every((t) => t.state === "done")) {
          this.finish();
        }
      });
    }
  }

  /** Skip the animation and show everything now. */
  reveal() {
    if (this.state !== "building") {
      return;
    }
    for (const t of this.tasks) {
      if (t.state !== "done") {
        t.cancel();
        t.state = "done";
      }
    }
    this.finish();
  }

  private finish() {
    this.cleanup();
    this.state = "done";
    this.engine.detach(this);
    this.options.onComplete?.();
  }

  private cleanup() {
    for (const el of this.hidden) {
      el.removeAttribute(HIDE_ATTR);
    }
    this.hidden.clear();
    for (const t of this.tasks) {
      t.layer.text?.release();
    }
  }

  /** Cancel any build in progress and restore the component as-is. */
  reset() {
    for (const t of this.tasks) {
      t.cancel();
    }
    this.cleanup();
    this.tasks = [];
    this.state = "idle";
    this.engine.detach(this);
  }

  destroy() {
    this.reset();
    this.engine.unregister(this);
  }
}
