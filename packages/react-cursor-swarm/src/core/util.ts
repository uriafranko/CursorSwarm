export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Cooperative cancellation flag shared by a task's animations. */
export interface Token {
  cancelled: boolean;
}

export class Cancelled extends Error {
  constructor() {
    super("swarm: cancelled");
    this.name = "Cancelled";
  }
}

export const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export function shuffle<T>(list: readonly T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type Ease = (t: number) => number;
export const linear: Ease = (t) => t;
export const easeInOutCubic: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInOutQuad: Ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutCubic: Ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic: Ease = (t) => t * t * t;
/** Quick start, long soft landing: how a hand moves a mouse to a target. */
export const easeReach: Ease = (t) => {
  const a = easeInOutCubic(t);
  const b = easeOutCubic(t);
  return a * 0.45 + b * 0.55;
};

export function toBox(r: DOMRectReadOnly): Box {
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** Intersection of two boxes; touching edges count (zero-size results are allowed). */
export function intersect(a: Box, b: Box): Box | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 < x1 || y2 < y1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function inflate(b: Box, m: number): Box {
  return { x: b.x - m, y: b.y - m, w: b.w + m * 2, h: b.h + m * 2 };
}

export function viewport(): Box {
  return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
}

/** Keep a point a few pixels inside the viewport so cursors never leave the screen mid-drag. */
export function inView(p: Point, pad = 6): Point {
  return {
    x: clamp(p.x, pad, window.innerWidth - pad),
    y: clamp(p.y, pad, window.innerHeight - pad),
  };
}

function parseAlpha(s: string): number {
  const t = s.trim();
  const v = parseFloat(t);
  if (Number.isNaN(v)) return 1;
  return t.endsWith("%") ? v / 100 : v;
}

/** Alpha channel of a computed CSS color (rgb(), rgba(), color(), oklch() ...). */
export function alphaOf(color: string | null | undefined): number {
  if (!color || color === "transparent") return 0;
  const m = color.match(/\(([^)]*)\)/);
  if (!m) return 1;
  const inner = m[1];
  if (inner.includes("/")) return parseAlpha(inner.split("/")[1]);
  const parts = inner.split(",");
  if (parts.length === 4) return parseAlpha(parts[3]);
  return 1;
}
