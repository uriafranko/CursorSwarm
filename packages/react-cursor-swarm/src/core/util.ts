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

export class CancelledError extends Error {
  constructor() {
    super("swarm: cancelled");
    this.name = "CancelledError";
  }
}

export const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export const shuffle = <T>(list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export type Ease = (t: number) => number;
export const linear: Ease = (t) => t;
export const easeInOutCubic: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeInOutQuad: Ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOutCubic: Ease = (t) => 1 - (1 - t) ** 3;
export const easeInCubic: Ease = (t) => t * t * t;
/** Quick start, long soft landing: how a hand moves a mouse to a target. */
export const easeReach: Ease = (t) => {
  const a = easeInOutCubic(t);
  const b = easeOutCubic(t);
  return a * 0.45 + b * 0.55;
};

export const toBox = (r: DOMRectReadOnly): Box => ({ h: r.height, w: r.width, x: r.left, y: r.top });

/** Intersection of two boxes; touching edges count (zero-size results are allowed). */
export const intersect = (a: Box, b: Box): Box | null => {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 < x1 || y2 < y1) {
    return null;
  }
  return { h: y2 - y1, w: x2 - x1, x: x1, y: y1 };
};

export const inflate = (b: Box, m: number): Box => ({ h: b.h + m * 2, w: b.w + m * 2, x: b.x - m, y: b.y - m });

export const viewport = (): Box => ({ h: window.innerHeight, w: window.innerWidth, x: 0, y: 0 });

/** Keep a point a few pixels inside the viewport so cursors never leave the screen mid-drag. */
export const inView = (p: Point, pad = 6): Point => ({
  x: clamp(p.x, pad, window.innerWidth - pad),
  y: clamp(p.y, pad, window.innerHeight - pad),
});

const parseAlpha = (s: string): number => {
  const t = s.trim();
  const v = Number.parseFloat(t);
  if (Number.isNaN(v)) {
    return 1;
  }
  return t.endsWith("%") ? v / 100 : v;
};

/** Alpha channel of a computed CSS color (rgb(), rgba(), color(), oklch() ...). */
export const alphaOf = (color: string | null | undefined): number => {
  if (!color || color === "transparent") {
    return 0;
  }
  const inner = color.match(/\((?<inner>[^)]*)\)/u)?.groups?.inner;
  if (inner === undefined) {
    return 1;
  }
  if (inner.includes("/")) {
    return parseAlpha(inner.split("/")[1]);
  }
  const parts = inner.split(",");
  if (parts.length === 4) {
    return parseAlpha(parts[3]);
  }
  return 1;
};
