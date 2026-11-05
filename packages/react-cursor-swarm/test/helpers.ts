/**
 * jsdom has no layout engine: every rect is 0×0. Give elements a size from `data-w` / `data-h`
 * (default 100×40) so the scanner treats them like rendered boxes.
 */
export function fakeLayout() {
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const w = Number(this.getAttribute("data-w") ?? 100);
    const h = Number(this.getAttribute("data-h") ?? 40);
    return { x: 0, y: 0, left: 0, top: 0, width: w, height: h, right: w, bottom: h, toJSON() {} } as DOMRect;
  };
}

/** Minimal stand-in for the CSS Custom Highlight API (missing in jsdom). */
export function fakeHighlights() {
  const g = globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> }; Highlight?: unknown };
  g.Highlight = class extends Set<AbstractRange> {
    priority = 0;
  };
  if (!g.CSS) g.CSS = {};
  g.CSS.highlights = new Map();
}

export function reducedMotion(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes("reduce"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

export function html(markup: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = markup.trim();
  document.body.appendChild(host);
  return host.firstElementChild as HTMLElement;
}
