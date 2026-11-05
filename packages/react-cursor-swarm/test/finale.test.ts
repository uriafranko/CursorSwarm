import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Agent } from "../src/core/agent";
import { SwarmEngine } from "../src/core/engine";
import type { Box } from "../src/core/util";
import { reducedMotion } from "./helpers";

// The engine normally runs on requestAnimationFrame; this test drives its frame callback by hand.
interface Internals {
  spawn: (target: Box) => Agent;
  tick: (now: number) => void;
  last: number;
}

/** One flocking cursor, two seconds of 60 fps frames; returns the path it took. */
const flockPath = (speed: number) => {
  reducedMotion(false);
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  const engine = new SwarmEngine({ agents: 1, finale: "flock", speed });
  const internals = engine as unknown as Internals;
  const agent = internals.spawn({ h: 0, w: 0, x: 300, y: 200 });
  agent.startFlock({ radius: 110, speed: 260 });
  internals.last = 0;
  const path: number[][] = [];
  for (let i = 1; i <= 120; i += 1) {
    internals.tick(i * (1000 / 60));
    path.push([agent.x, agent.y]);
  }
  const buildTime = engine.time;
  engine.dispose();
  vi.restoreAllMocks();
  return { buildTime, path };
};

describe("flock finale", () => {
  beforeAll(() => {
    // jsdom has no Web Animations API; cursors only use it for a fade-in.
    Element.prototype.animate = (() => ({ cancel() {} })) as unknown as Element["animate"];
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("moves at 1× whatever the build speed", () => {
    const normal = flockPath(1);
    const fast = flockPath(3);
    // building did speed up...
    expect(fast.buildTime).toBeCloseTo(normal.buildTime * 3);
    for (const [i, [x, y]] of fast.path.entries()) {
      // ...but the flock took the exact same path at the same pace.
      expect(x).toBeCloseTo(normal.path[i][0], 6);
      expect(y).toBeCloseTo(normal.path[i][1], 6);
    }
    const moved = Math.hypot(normal.path[119][0] - normal.path[0][0], normal.path[119][1] - normal.path[0][1]);
    // and it really was flying, not parked
    expect(moved).toBeGreaterThan(50);
  });
});
