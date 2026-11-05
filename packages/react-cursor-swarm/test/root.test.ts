import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SwarmEngine } from "../src/core/engine";
import { HIDE_ATTR, SwarmRoot } from "../src/core/root";
import { fakeLayout, html, reducedMotion } from "./helpers";

let engine: SwarmEngine;

const card = () =>
  html(
    `<div style="background-color: rgb(255,255,255)"><span style="display:block;border:1px solid rgb(0,0,0)"></span></div>`
  );

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
