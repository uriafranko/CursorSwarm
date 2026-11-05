import type { Agent } from "./agent";
import type { SwarmEngine } from "./engine";
import { Caret, Ghost, Measure, PenLine, Selection } from "./overlay";
import type { Task } from "./task";
import { clamp, easeInOutCubic, easeInOutQuad, intersect, inView, rand, viewport, type Box, type Point } from "./util";

const at = (b: Box | null, fx: number, fy: number, dx = 0, dy = 0): Point | null =>
  b ? inView({ x: b.x + b.w * fx + dx, y: b.y + b.h * fy + dy }) : null;

/** Crosshair drag with a live W × H badge, gray placeholder, then the real element fades (or sweeps) in. */
async function drawBox(a: Agent, t: Task, e: SwarmEngine, effect: "fade" | "sweep") {
  const tok = t.token;
  const box = () => e.box(t.el);
  const tl = () => at(box(), 0, 0);
  const br = () => at(box(), 1, 1);

  await a.moveTo(tl, tok, { near: () => a.setMode("crosshair") });
  a.setMode("crosshair");
  await a.press(tok, 60);
  const sel = new Selection(e, t, a.color, { badge: true, placeholder: true, radius: t.layer.radius }).drag(tl, a);
  const b0 = box();
  const size = b0 ? Math.sqrt(b0.w * b0.h) : 100;
  await a.moveTo(br, tok, { dur: clamp(240 + size * 1.5, 300, 820), ease: easeInOutQuad, bend: rand(-0.05, 0.05) });
  sel.pin(box);
  await a.release(tok, 70);

  if (effect === "sweep") sel.sweepPlaceholder(560);
  else sel.fadePlaceholder(300);
  t.reveal(effect);
  await e.wait(effect === "sweep" ? 260 : 160, tok);
  t.complete();
  a.setMode("arrow");
  sel.fadeOut(360, 220);
}

/** Drag a text box with the I-beam, then type the real text in place with a caret. */
async function typeText(a: Agent, t: Task, e: SwarmEngine) {
  const tok = t.token;
  const tb = t.layer.text!;
  const fast = !!t.layer.fast;
  const rect = () => e.textBox(t);
  const padded = () => {
    const r = rect();
    return r && { x: r.x - 2, y: r.y - 1, w: r.w + 4, h: r.h + 2 };
  };

  let frame: Selection;
  if (!fast) {
    const tl = () => at(padded(), 0, 0);
    const br = () => at(padded(), 1, 1);
    await a.moveTo(tl, tok, { near: () => a.setMode("ibeam") });
    a.setMode("ibeam");
    await a.press(tok, 50);
    frame = new Selection(e, t, a.color, { className: "tbox", handles: false }).drag(tl, a);
    const r0 = rect();
    await a.moveTo(br, tok, {
      dur: clamp(160 + (r0?.w ?? 100) * 0.55, 200, 520),
      ease: easeInOutQuad,
      bend: rand(-0.04, 0.04),
    });
    frame.pin(padded);
    await a.release(tok, 60);
  } else {
    // Retyping inside a duplicate: click into the text and go.
    await a.moveTo(
      () => {
        const c = tb.start();
        return c ? inView({ x: c.x + 3, y: c.y + c.h / 2 }) : at(rect(), 0, 0.5);
      },
      tok,
      { near: () => a.setMode("ibeam") },
    );
    a.setMode("ibeam");
    await a.press(tok, 45);
    await a.release(tok, 30);
    frame = new Selection(e, t, a.color, { className: "tbox", handles: false }).pin(padded);
  }

  const caret = new Caret(e, t, a.color);
  let i = -1;
  caret.follow(() => (i < 0 ? tb.start() : tb.caret(i)));
  await e.wait(fast ? 40 : 110, tok);
  caret.setTyping(true);

  const n = tb.length;
  const chunk = Math.max(1, Math.ceil(n / (fast ? 26 : 64)));
  const base = fast ? 20 : 34;
  while (i < n - 1) {
    i = Math.min(n - 1, i + chunk);
    if (!tb.show(i)) break;
    const ch = tb.charAt(i);
    let d = base * rand(0.55, 1.45);
    if (ch === " ") d *= 1.25;
    else if (/[.,!?;:]/.test(ch)) d *= 2.2;
    await e.wait(d, tok);
  }
  tb.release();
  caret.setTyping(false);
  t.complete();
  a.setMode("arrow");
  frame.fadeOut(300, 160);
  caret.fadeOut(200, 420);
}

/** Pen tool: click an anchor, rubber-band to the other end, click again. Used for single-side borders and <hr>. */
async function penLine(a: Agent, t: Task, e: SwarmEngine) {
  const tok = t.token;
  const side = t.layer.side ?? "bottom";
  const bw = t.layer.borderWidth ?? 1;
  const ends = (): [Point, Point] | null => {
    const b = e.box(t.el);
    if (!b) return null;
    switch (side) {
      case "top":
        return [
          { x: b.x, y: b.y + bw / 2 },
          { x: b.x + b.w, y: b.y + bw / 2 },
        ];
      case "bottom":
        return [
          { x: b.x, y: b.y + b.h - bw / 2 },
          { x: b.x + b.w, y: b.y + b.h - bw / 2 },
        ];
      case "left":
        return [
          { x: b.x + bw / 2, y: b.y },
          { x: b.x + bw / 2, y: b.y + b.h },
        ];
      case "right":
        return [
          { x: b.x + b.w - bw / 2, y: b.y },
          { x: b.x + b.w - bw / 2, y: b.y + b.h },
        ];
      default:
        return [
          { x: b.x, y: b.y + b.h / 2 },
          { x: b.x + b.w, y: b.y + b.h / 2 },
        ];
    }
  };
  const p = () => {
    const s = ends();
    return s && inView(s[0]);
  };
  const q = () => {
    const s = ends();
    return s && inView(s[1]);
  };

  await a.moveTo(p, tok, { near: () => a.setMode("pen") });
  a.setMode("pen");
  await a.press(tok, 50);
  await a.release(tok, 30);
  const line = new PenLine(e, t, a.color, p, () => a.pos);
  const s0 = ends();
  const len = s0 ? Math.hypot(s0[1].x - s0[0].x, s0[1].y - s0[0].y) : 100;
  await a.moveTo(q, tok, { dur: clamp(220 + len * 0.7, 280, 760), ease: easeInOutQuad, bend: 0 });
  line.pinEnd(q);
  await a.press(tok, 50);
  await a.release(tok, 30);
  t.reveal("fade");
  await e.wait(140, tok);
  t.complete();
  a.setMode("arrow");
  line.fadeOut(320, 120);
}

/** Select the original, ⌥-drag a copy into place with live spacing measurements. */
async function duplicate(a: Agent, t: Task, e: SwarmEngine) {
  const tok = t.token;
  const master = t.layer.master!;
  const mBox = () => e.box(master);
  const dBox = () => e.box(t.el);
  const mb = mBox();
  if (!mb || mb.w * mb.h === 0 || !intersect(mb, viewport())) return drawBox(a, t, e, "fade");

  const gx = mb.w * rand(0.3, 0.7);
  const gy = Math.min(mb.h * rand(0.25, 0.6), 64);
  const grab = () => {
    const b = mBox();
    return b && inView({ x: b.x + gx, y: b.y + gy });
  };
  a.setMode("arrow");
  await a.moveTo(grab, tok);
  const sel = new Selection(e, t, a.color, {}).pin(mBox);
  await a.press(tok, 90);
  a.setMode("duplicate");

  const ghostBox = (): Box | null => {
    const b = mBox();
    return b && { x: a.x - gx, y: a.y - gy, w: b.w, h: b.h };
  };
  const ghost = new Ghost(e, t, a.color, ghostBox, t.layer.radius);
  const meas = new Measure(e, t, mBox, ghostBox);
  const target = () => {
    const b = dBox();
    return b && inView({ x: b.x + gx, y: b.y + gy });
  };
  const d0 = target();
  const dist = d0 ? Math.hypot(d0.x - a.x, d0.y - a.y) : 200;
  await a.moveTo(target, tok, {
    dur: clamp(300 + dist * 0.55, 380, 900),
    ease: easeInOutCubic,
    bend: rand(-0.08, 0.08),
  });
  ghost.rect = dBox;
  await a.release(tok, 60);

  t.reveal("fade");
  sel.fadeOut(220);
  meas.fadeOut(200);
  await e.wait(150, tok);
  t.complete();
  a.setMode("arrow");
  ghost.fadeOut(300, 100);
}

export function runScript(a: Agent, t: Task, e: SwarmEngine): Promise<void> {
  switch (t.kind) {
    case "box":
      return drawBox(a, t, e, "fade");
    case "media":
      return drawBox(a, t, e, "sweep");
    case "line":
      return penLine(a, t, e);
    case "text":
      return typeText(a, t, e);
    case "dup":
      return duplicate(a, t, e);
  }
}
