/**
 * jsdom has no layout engine: every rect is 0×0. Give elements a size from `data-w` / `data-h`
 * (default 100×40) so the scanner treats them like rendered boxes.
 */
const fakeRect = function fakeRect(this: Element) {
  const w = Number(this.getAttribute("data-w") ?? 100);
  const h = Number(this.getAttribute("data-h") ?? 40);
  return {
    bottom: h,
    height: h,
    left: 0,
    right: w,
    toJSON() {
      /* empty */
    },
    top: 0,
    width: w,
    x: 0,
    y: 0,
  } as DOMRect;
};

export const fakeLayout = () => {
  Element.prototype.getBoundingClientRect = fakeRect;
};

/** Minimal stand-in for the CSS Custom Highlight API (missing in jsdom). */
export const fakeHighlights = () => {
  const g = globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> }; Highlight?: unknown };
  g.Highlight = class extends Set<AbstractRange> {
    priority = 0;
  };
  if (!g.CSS) {
    g.CSS = {};
  }
  g.CSS.highlights = new Map();
};

export const reducedMotion = (on: boolean) => {
  window.matchMedia = ((query: string) => ({
    addEventListener() {
      /* empty */
    },
    matches: on && query.includes("reduce"),
    media: query,
    removeEventListener() {
      /* empty */
    },
  })) as unknown as typeof window.matchMedia;
};

export const html = (markup: string): HTMLElement => {
  const host = document.createElement("div");
  host.innerHTML = markup.trim();
  document.body.append(host);
  return host.firstElementChild as HTMLElement;
};
