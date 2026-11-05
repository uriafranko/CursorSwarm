import { isBrowser, toBox } from "./util";
import type { Box } from "./util";

export const HIGHLIGHT_NAME = "swarm-untyped";

interface HighlightLike {
  add: (r: AbstractRange) => void;
  delete: (r: AbstractRange) => boolean;
  priority?: number;
}

let cached: HighlightLike | null | undefined;

/**
 * Untyped text is hidden with the CSS Custom Highlight API: the real text stays laid out
 * exactly where it is (no reflow, no DOM mutation), it is just painted transparent until typed.
 */
const registry = (): HighlightLike | null => {
  if (cached !== undefined) {
    return cached;
  }
  cached = null;
  if (!isBrowser) {
    return null;
  }
  const g = globalThis as unknown as {
    CSS?: { highlights?: Map<string, HighlightLike> };
    Highlight?: new () => HighlightLike;
  };
  if (!g.CSS?.highlights || typeof g.Highlight !== "function") {
    return null;
  }
  let h = g.CSS.highlights.get(HIGHLIGHT_NAME);
  if (!h) {
    h = new g.Highlight();
    h.priority = 1000;
    g.CSS.highlights.set(HIGHLIGHT_NAME, h);
  }
  cached = h;
  return h;
};

export const canType = () => registry() !== null;

interface Step {
  /** Node index. */
  n: number;
  /** Offset just after the character(s) revealed by this step. */
  o: number;
  ch: string;
}

/** A run of text nodes that render as one block of text, typed as a unit. */
export class TextBlock {
  readonly steps: Step[] = [];
  private hidden: Range | null = null;

  readonly nodes: Text[];

  constructor(nodes: Text[], preserveWhitespace: boolean) {
    this.nodes = nodes;
    let prevSpace = true;
    for (const [n, node] of nodes.entries()) {
      const d = node.data;
      for (let o = 0; o < d.length; o += 1) {
        let ch = d[o];
        // oxlint-disable-next-line unicorn/prefer-code-point -- surrogate-pair check needs UTF-16 code units
        const code = d.charCodeAt(o);
        if (code >= 0xd8_00 && code <= 0xdb_ff && o + 1 < d.length) {
          ch += d[o + 1];
          o += 1;
        }
        const space = /\s/u.test(ch);
        if (!preserveWhitespace && space && prevSpace) {
          // Collapsed whitespace renders as nothing: fold it into the previous keystroke.
          if (this.steps.length) {
            this.steps[this.steps.length - 1] = { ch: " ", n, o: o + 1 };
          }
          continue;
        }
        prevSpace = space;
        this.steps.push({ ch, n, o: o + 1 });
      }
    }
  }

  get length() {
    return this.steps.length;
  }

  charAt(i: number) {
    return this.steps[i]?.ch ?? "";
  }

  valid() {
    for (const n of this.nodes) {
      if (!n.isConnected) {
        return false;
      }
    }
    return true;
  }

  hide(): boolean {
    const h = registry();
    if (!h || !this.nodes.length) {
      return false;
    }
    const r = document.createRange();
    const last = this.nodes[this.nodes.length - 1];
    try {
      r.setStart(this.nodes[0], 0);
      r.setEnd(last, last.length);
    } catch {
      return false;
    }
    h.add(r);
    this.hidden = r;
    return true;
  }

  /** Reveal everything up to and including step `i`. Returns false if the DOM changed under us. */
  show(i: number): boolean {
    const s = this.steps[i];
    if (!s || !this.hidden || !this.valid()) {
      return false;
    }
    try {
      this.hidden.setStart(this.nodes[s.n], Math.min(s.o, this.nodes[s.n].length));
    } catch {
      return false;
    }
    return true;
  }

  release() {
    if (this.hidden) {
      registry()?.delete(this.hidden);
      this.hidden = null;
    }
  }

  rect(): Box | null {
    if (!this.valid()) {
      return null;
    }
    const r = document.createRange();
    const last = this.nodes[this.nodes.length - 1];
    r.setStart(this.nodes[0], 0);
    r.setEnd(last, last.length);
    const b = toBox(r.getBoundingClientRect());
    return b.w === 0 && b.h === 0 ? null : b;
  }

  /** Caret position (right edge of the last revealed character). */
  caret(i: number): Box | null {
    const s = this.steps[i];
    if (!s || !this.valid()) {
      return null;
    }
    const node = this.nodes[s.n];
    const end = Math.min(s.o, node.length);
    const start = Math.max(0, end - (s.ch.length || 1));
    const r = document.createRange();
    r.setStart(node, start);
    r.setEnd(node, end);
    const rects = r.getClientRects();
    const last = rects[rects.length - 1];
    if (!last || last.height === 0) {
      return null;
    }
    return { h: last.height, w: 0, x: last.right, y: last.top };
  }

  /** Caret before the first character, used before any key has been pressed. */
  start(): Box | null {
    if (!this.steps.length || !this.valid()) {
      return null;
    }
    const [s] = this.steps;
    const node = this.nodes[s.n];
    const end = Math.min(s.o, node.length);
    const r = document.createRange();
    r.setStart(node, Math.max(0, end - (s.ch.length || 1)));
    r.setEnd(node, end);
    const [first] = r.getClientRects();
    if (!first || first.height === 0) {
      return null;
    }
    return { h: first.height, w: 0, x: first.left, y: first.top };
  }
}
