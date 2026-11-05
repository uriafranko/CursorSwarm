import { TextBlock, canType } from "./text";
import { alphaOf } from "./util";

export type LayerKind = "box" | "media" | "line" | "text" | "dup";
export type Detail = "full" | "boxes" | "outline";
export type Side = "top" | "right" | "bottom" | "left" | "hr";

/** One thing a cursor builds. */
export interface Layer {
  kind: LayerKind;
  /** The element itself (for text: the block element that holds the text run). */
  el: Element;
  /** Nearest ancestor layer: it has to be built first. */
  parent: Layer | null;
  radius?: string;
  text?: TextBlock;
  /** Text inside a duplicate is retyped quickly, without dragging a text box first. */
  fast?: boolean;
  side?: Side;
  borderWidth?: number;
  /** For duplicates: the sibling it is ⌥-dragged from. */
  master?: Element;
}

export interface ScanOptions {
  detail: Detail;
  duplicates: boolean;
  maxLayers: number;
}

const MEDIA = new Set(["IMG", "VIDEO", "CANVAS", "PICTURE", "IFRAME", "OBJECT", "EMBED", "SVG"]);
const CONTROLS = new Set(["INPUT", "TEXTAREA", "SELECT", "PROGRESS", "METER"]);
const SKIP = new Set([
  "SCRIPT",
  "STYLE",
  "TEMPLATE",
  "NOSCRIPT",
  "LINK",
  "META",
  "TITLE",
  "HEAD",
  "BR",
  "WBR",
  "DATALIST",
]);
const NO_TEXT = new Set([...CONTROLS, "OPTION", "OPTGROUP"]);
const SIDES = ["Top", "Right", "Bottom", "Left"] as const;

const tagOf = (el: Element) => el.tagName.toUpperCase();

const isSet = (v: string | null | undefined) => !!v && v !== "none";

const hasUrlBackground = (cs: CSSStyleDeclaration) => (cs.backgroundImage || "").includes("url(");

/** Computed visibility can be "" outside real browsers; only an explicit hidden/collapse counts. */
const invisible = (cs: CSSStyleDeclaration) => cs.visibility === "hidden" || cs.visibility === "collapse";

const classify = (tag: string, cs: CSSStyleDeclaration): { kind: LayerKind; side?: Side; bw?: number } | null => {
  if (MEDIA.has(tag)) {
    return { kind: "media" };
  }
  if (tag === "HR") {
    return { bw: 1, kind: "line", side: "hr" };
  }
  if (CONTROLS.has(tag)) {
    return { kind: "box" };
  }
  if (hasUrlBackground(cs)) {
    return { kind: "media" };
  }
  const bg = alphaOf(cs.backgroundColor) > 0.01 || isSet(cs.backgroundImage);
  // Real shadows never contain "none" (some engines report "currentcolor none" for no shadow).
  const shadow = isSet(cs.boxShadow) && !/\bnone\b/u.test(cs.boxShadow);
  const blur = isSet((cs as CSSStyleDeclaration & { backdropFilter?: string }).backdropFilter);
  const sides = SIDES.filter((s) => {
    const w = Number.parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`));
    const style = cs.getPropertyValue(`border-${s.toLowerCase()}-style`);
    const color = cs.getPropertyValue(`border-${s.toLowerCase()}-color`);
    return w > 0 && style !== "none" && style !== "hidden" && alphaOf(color) > 0.01;
  });
  if (bg || shadow || blur || sides.length >= 2) {
    return { kind: "box" };
  }
  if (sides.length === 1) {
    const [s] = sides;
    return {
      bw: Number.parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)),
      kind: "line",
      side: s.toLowerCase() as Side,
    };
  }
  if (tag === "BUTTON" && isSet(cs.appearance)) {
    return { kind: "box" };
  }
  return null;
};

/** Shape fingerprint used to spot repeated siblings (cards, rows, list items). */
const signature = (el: Element) => {
  let kids = "";
  for (const c of [...el.children]) {
    kids += `${c.tagName},`;
  }
  return `${el.tagName}|${el.getAttribute("class") ?? ""}|${kids}`;
};

const duplicatesAmong = (kids: Element[]): Map<Element, Element> => {
  const out = new Map<Element, Element>();
  let run: Element[] = [];
  let sig = "";
  const flush = () => {
    if (run.length >= 2) {
      for (let i = 1; i < run.length; i += 1) {
        out.set(run[i], run[0]);
      }
    }
    run = [];
  };
  for (const kid of kids) {
    if (MEDIA.has(tagOf(kid)) || CONTROLS.has(tagOf(kid))) {
      flush();
      sig = "";
      continue;
    }
    const r = kid.getBoundingClientRect();
    if (r.width < 24 || r.height < 14) {
      flush();
      sig = "";
      continue;
    }
    const s = signature(kid);
    if (s !== sig) {
      flush();
      sig = s;
    }
    run.push(kid);
  }
  flush();
  return out;
};

/** Walk the wrapped component's DOM and decompose it into layers to build. */
export const scan = (roots: Element[], o: ScanOptions): Layer[] => {
  const layers: Layer[] = [];

  if (o.detail === "outline") {
    for (const el of roots) {
      const r = el.getBoundingClientRect();
      if (r.width * r.height > 0) {
        layers.push({ el, kind: "box", parent: null, radius: getComputedStyle(el).borderRadius });
      }
    }
    return layers;
  }

  const rootSet = new Set(roots);
  const owner = new Map<Element, Layer>();
  const display = new Map<Element, string>();
  const texts: { node: Text; parent: Element }[] = [];
  const typing = o.detail === "full" && canType();

  // oxlint-disable-next-line complexity -- the DOM walk classifies every node kind in one place
  const visit = (el: Element, parent: Layer | null, dup: Layer | null) => {
    const tag = tagOf(el);
    if (SKIP.has(tag) || el.hasAttribute("data-swarm-overlay")) {
      return;
    }
    const cs = getComputedStyle(el);
    display.set(el, cs.display);
    if (cs.display === "none") {
      return;
    }
    // Skip what the app itself hides (but not things that merely inherit our own pending state).
    if (invisible(cs) && el.parentElement && !invisible(getComputedStyle(el.parentElement))) {
      return;
    }
    const skipSelf = el.hasAttribute("data-swarm-skip");

    let layer: Layer | null = null;
    if (dup) {
      owner.set(el, dup);
    } else if (!skipSelf && layers.length < o.maxLayers) {
      const c = classify(tag, cs);
      if (c) {
        const r = el.getBoundingClientRect();
        const big = c.kind === "line" ? Math.max(r.width, r.height) >= 8 : r.width >= 3 && r.height >= 3;
        if (big) {
          layer = { borderWidth: c.bw, el, kind: c.kind, parent, radius: cs.borderRadius, side: c.side };
          layers.push(layer);
          owner.set(el, layer);
        }
      }
    }

    if (MEDIA.has(tag) || CONTROLS.has(tag)) {
      return;
    }
    const next = layer ?? parent;
    const kids = [...el.children];
    const dupOf = !dup && o.duplicates && o.detail === "full" ? duplicatesAmong(kids) : null;
    const content = new Map<Element, number>();

    for (const node of [...el.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!NO_TEXT.has(tag)) {
          texts.push({ node: node as Text, parent: el });
        }
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      const kid = node as Element;
      const master = dupOf?.get(kid);
      if (master && (content.get(master) ?? 0) > 0 && layers.length < o.maxLayers) {
        const d: Layer = { el: kid, kind: "dup", master, parent: next, radius: getComputedStyle(kid).borderRadius };
        layers.push(d);
        visit(kid, next, d);
        continue;
      }
      const before = layers.length + texts.length;
      visit(kid, next, dup);
      content.set(kid, layers.length + texts.length - before);
    }
  };

  for (const r of roots) {
    visit(r, null, null);
  }

  if (typing) {
    const blockOf = (el: Element): Element => {
      let e: Element | null = el;
      while (e) {
        const d = display.get(e) ?? getComputedStyle(e).display;
        if (rootSet.has(e) || (d !== "inline" && d !== "contents")) {
          return e;
        }
        e = e.parentElement;
      }
      return el;
    };
    const layerOf = (el: Element): Layer | null => {
      let e: Element | null = el;
      while (e) {
        const l = owner.get(e);
        if (l) {
          return l;
        }
        if (rootSet.has(e)) {
          return null;
        }
        e = e.parentElement;
      }
      return null;
    };

    let run: { block: Element; nodes: Text[] } | null = null;
    const flush = () => {
      const cur = run;
      run = null;
      if (!cur || layers.length >= o.maxLayers) {
        return;
      }
      if (!cur.nodes.some((n) => /\S/u.test(n.data))) {
        return;
      }
      if (cur.block.closest("[data-swarm-skip]")) {
        return;
      }
      const br = cur.block.getBoundingClientRect();
      // Visually-hidden text.
      if (br.width < 4 || br.height < 4) {
        return;
      }
      const ws = getComputedStyle(cur.block).whiteSpace;
      const block = new TextBlock(cur.nodes, ws.startsWith("pre") || ws === "break-spaces");
      if (!block.length) {
        return;
      }
      const parent = layerOf(cur.block);
      layers.push({ el: cur.block, fast: parent?.kind === "dup", kind: "text", parent, text: block });
    };
    for (const { node, parent } of texts) {
      const block = blockOf(parent);
      if (!run || run.block !== block) {
        flush();
        run = { block, nodes: [] };
      }
      run.nodes.push(node);
    }
    flush();
  }

  return layers;
};
