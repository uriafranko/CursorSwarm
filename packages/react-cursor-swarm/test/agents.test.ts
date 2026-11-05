import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Agent } from "../src/core/agent";
import { SwarmEngine } from "../src/core/engine";
import type { Box } from "../src/core/util";
import { reducedMotion } from "./helpers";

// The scheduler normally runs on requestAnimationFrame; tests call it directly.
interface Internals {
  spawn(target: Box): Agent;
  schedule(now: number): void;
}

let engine: SwarmEngine;
let internals: Internals;
let now = 0;
const tick = () => internals.schedule((now += 1000));
const spawn = (n: number) => Array.from({ length: n }, () => internals.spawn({ x: 100, y: 100, w: 0, h: 0 }));
const staying = () => engine.agents.filter((a) => a.state !== "leaving");

beforeAll(() => {
  // jsdom has no Web Animations API; cursors only use it for a fade-in.
  Element.prototype.animate = (() => ({ cancel() {} })) as unknown as Element["animate"];
});
beforeEach(() => {
  document.body.innerHTML = "";
  reducedMotion(false);
  engine = new SwarmEngine({ agents: 5 });
  internals = engine as unknown as Internals;
});
afterEach(() => engine.dispose());

describe("agent limit", () => {
  it("setAgents() lowers the limit live: free cursors over it leave, newest first", () => {
    const team = spawn(5);
    engine.setAgents(2);
    tick();
    expect(staying()).toEqual(team.slice(0, 2));
    expect(team.slice(2).every((a) => a.state === "leaving")).toBe(true);
  });

  it("lets busy cursors finish their layer before sending them away", () => {
    const team = spawn(4);
    for (const a of team) a.state = "busy";
    engine.setAgents(1);
    tick();
    expect(staying()).toHaveLength(4);

    team[3].state = "idle";
    tick();
    expect(team[3].state).toBe("leaving");
    expect(staying()).toHaveLength(3);
  });

  it("applies a changed `agents` option from setOptions() (the provider path)", () => {
    spawn(5);
    engine.setOptions({ agents: 3 });
    tick();
    expect(staying()).toHaveLength(3);
  });

  it("keeps cursors when the limit goes up", () => {
    spawn(3);
    engine.setAgents(8);
    tick();
    expect(staying()).toHaveLength(3);
  });

  it("lets a flock stay bigger than the limit when flock.size asks for it", () => {
    engine.setOptions({ agents: 2, flock: { size: 6 } });
    spawn(5);
    engine.flock();
    tick();
    expect(engine.agents.some((a) => a.state === "leaving")).toBe(false);
  });

  it("rounds the limit to a whole number, at least 1", () => {
    engine.setAgents(2.6);
    expect(engine.maxAgents).toBe(3);
    engine.setAgents(0);
    expect(engine.maxAgents).toBe(1);
    engine.setAgents(Number.NaN);
    expect(engine.maxAgents).toBe(1);
  });
});
