import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Agent } from "../src/core/agent";
import { SwarmEngine } from "../src/core/engine";
import type { Box } from "../src/core/util";
import { reducedMotion } from "./helpers";

// The engine normally runs on requestAnimationFrame; this test drives its frame callback by hand.
interface Internals {
  spawn(target: Box): Agent;
  tick(now: number): void;
  last: number;
}

beforeAll(() => {
  // jsdom has no Web Animations API; cursors only use it for a fade-in.
  Element.prototype.animate = (() => ({ cancel() {} })) as unknown as Element["animate"];
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => vi.restoreAllMocks());

/** One flocking cursor, two seconds of 60 fps frames; returns the path it took. */
function flockPath(speed: number) {
  reducedMotion(false);
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  const engine = new SwarmEngine({ agents: 1, speed, finale: "flock" });
  const internals = engine as unknown as Internals;
  const agent = internals.spawn({ x: 300, y: 200, w: 0, h: 0 });
  agent.startFlock({ radius: 110, speed: 260 });
  internals.last = 0;
  const path: number[][] = [];
  for (let i = 1; i <= 120; i++) {
    internals.tick(i * (1000 / 60));
    path.push([agent.x, agent.y]);
  }
  const buildTime = engine.time;
  engine.dispose();
  vi.restoreAllMocks();
  return { path, buildTime };
}

describe("flock finale", () => {
  it("moves at 1× whatever the build speed", () => {
    const normal = flockPath(1);
    const fast = flockPath(3);
    expect(fast.buildTime).toBeCloseTo(normal.buildTime * 3); // building did speed up...
    fast.path.forEach(([x, y], i) => {
      // ...but the flock took the exact same path at the same pace.
      expect(x).toBeCloseTo(normal.path[i][0], 6);
      expect(y).toBeCloseTo(normal.path[i][1], 6);
    });
    const moved = Math.hypot(normal.path[119][0] - normal.path[0][0], normal.path[119][1] - normal.path[0][1]);
    expect(moved).toBeGreaterThan(50); // and it really was flying, not parked
  });
});
