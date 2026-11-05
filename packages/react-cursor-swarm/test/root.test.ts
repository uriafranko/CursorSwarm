import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SwarmEngine } from "../src/core/engine";
import { HIDE_ATTR, STILL_ATTR, SwarmRoot } from "../src/core/root";
import { fakeLayout, html, reducedMotion } from "./helpers";

let engine: SwarmEngine;

const card = () =>
  html(
    `<div style="background-color: rgb(255,255,255)"><span style="display:block;border:1px solid rgb(0,0,0)"></span></div>`
  );

// Tailwind's `transition-all` (on most shadcn/ui buttons, badges and toggles) transitions `visibility`
// too. Mid-transition an element can read as hidden, and once hidden it stays visible until the
// transition ends. jsdom has no transitions, so fake the first: the element reads as hidden unless
// transitions are switched off around it.
const midTransition = (cs: CSSStyleDeclaration) =>
  new Proxy(cs, {
    get(target, key) {
      if (key === "visibility") {
        return "hidden";
      }
      const value: unknown = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

describe("root", () => {
  beforeAll(fakeLayout);
  beforeEach(() => {
    document.body.innerHTML = "";
    reducedMotion(false);
    engine = new SwarmEngine();
  });
  afterEach(() => engine.dispose());

  describe(SwarmRoot, () => {
    it("hides every layer on start and restores everything on reset", () => {
      const el = card();
      const root = new SwarmRoot(engine, () => [el]);
      root.start();
      expect(root.state).toBe("building");
      expect(document.querySelectorAll(`[${HIDE_ATTR}]`)).toHaveLength(2);
      expect(document.querySelector("[data-swarm-overlay]")).not.toBeNull();
      root.reset();
      expect(root.state).toBe("idle");
      expect(document.querySelectorAll(`[${HIDE_ATTR}]`)).toHaveLength(0);
    });

    it("reveal() skips to the end and fires onComplete", () => {
      const el = card();
      const onComplete = vi.fn<() => void>();
      const root = new SwarmRoot(engine, () => [el], { onComplete });
      root.start();
      root.reveal();
      expect(root.state).toBe("done");
      expect(onComplete).toHaveBeenCalledOnce();
      expect(document.querySelectorAll(`[${HIDE_ATTR}]`)).toHaveLength(0);
    });

    it("finishes immediately for users who prefer reduced motion", () => {
      reducedMotion(true);
      const el = card();
      const onComplete = vi.fn<() => void>();
      new SwarmRoot(engine, () => [el], { onComplete }).start();
      expect(onComplete).toHaveBeenCalledOnce();
      expect(document.querySelectorAll(`[${HIDE_ATTR}]`)).toHaveLength(0);
    });

    it("dispose() restores the page and removes the overlay", () => {
      const el = card();
      new SwarmRoot(engine, () => [el]).start();
      engine.dispose();
      expect(document.querySelectorAll(`[${HIDE_ATTR}]`)).toHaveLength(0);
      expect(document.querySelector("[data-swarm-overlay]")).toBeNull();
    });
  });

  describe("CSS transitions", () => {
    afterEach(() => vi.restoreAllMocks());

    it("scans with transitions off, so a half-finished visibility transition doesn't hide an element from it", () => {
      const el = html(
        `<div style="background-color: rgb(255,255,255)"><button class="moving" style="background-color: rgb(0,0,0)">Go</button></div>`
      );
      const real = window.getComputedStyle.bind(window);
      vi.spyOn(window, "getComputedStyle").mockImplementation((target, pseudo) => {
        const cs = real(target, pseudo);
        return target.classList.contains("moving") && !target.closest(`[${STILL_ATTR}]`) ? midTransition(cs) : cs;
      });
      new SwarmRoot(engine, () => [el]).start();
      expect(el.querySelector(".moving")?.hasAttribute(HIDE_ATTR)).toBeTruthy();
    });

    it("switches transitions back on once the component is hidden", () => {
      const el = card();
      new SwarmRoot(engine, () => [el]).start();
      expect(document.querySelector(`[${STILL_ATTR}]`)).toBeNull();
      const css = document.querySelector("style[data-swarm-styles]")?.textContent ?? "";
      expect(css).toContain(`[${STILL_ATTR}] *`);
      expect(css).toContain("transition: none !important");
    });
  });

  describe("engine options", () => {
    it("applies defaults and accepts the flock finale", () => {
      const e = new SwarmEngine({ finale: "flock", flock: { radius: 90 } });
      expect(e.options.finale).toBe("flock");
      expect(e.options.flock.radius).toBe(90);
      expect(new SwarmEngine().options).toMatchObject({ agents: 8, finale: "leave", labels: true, speed: 1 });
    });

    it("flock() does nothing under reduced motion", () => {
      reducedMotion(true);
      engine.flock();
      expect(engine.flocking).toBeFalsy();
    });
  });
});
