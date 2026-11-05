import { describe, expect, it } from "vitest";

import { makeBoid, stepBoid } from "../src/core/flock";
import type { Boid, FlockParams } from "../src/core/flock";
import type { Point } from "../src/core/util";

const ORIGIN = { x: 500, y: 400 };
const STILL = { x: 0, y: 0 };
const ORBIT = { radius: 110, speed: 260 };
const dist = (b: Boid, p: Point = ORIGIN) => Math.hypot(b.x - p.x, b.y - p.y);
const fixed = () => 0.5;
const uTurn = () => 0.1;
/** Signed angular velocity around `p`: its sign is the orbit direction. */
const spinOf = (b: Boid, p: Point = ORIGIN) => (b.x - p.x) * b.vy - (b.y - p.y) * b.vx;

interface Run {
  pointer?: (t: number) => Point;
  vel?: Point;
  flock?: Boid[];
  randomness?: number;
  rand?: () => number;
  from?: number;
}

/** Step at 60 fps; returns the time reached so runs can be chained. */
const run = (b: Boid, steps: number, o: Run = {}) => {
  const flock = o.flock ?? [b];
  const from = o.from ?? 0;
  for (let i = 0; i < steps; i += 1) {
    const t = from + i / 60;
    const params: FlockParams = { fleeRadius: 80, rand: o.rand ?? fixed, randomness: o.randomness ?? 0, time: t };
    stepBoid(b, o.pointer?.(t) ?? ORIGIN, o.vel ?? STILL, flock, params, 1 / 60);
  }
  return from + steps / 60;
};

describe("flocking", () => {
  it("flies in fast and settles onto a round orbit", () => {
    const b = makeBoid(ORIGIN.x + 600, ORIGIN.y, ORBIT, fixed);
    // 1.5 s
    const t = run(b, 90);
    expect(dist(b)).toBeLessThan(b.radius * 1.3);

    // Once there, the distance barely changes over two full laps: a circle, not a lumpy loop.
    let lo = Infinity;
    let hi = 0;
    for (let i = 0; i < 240; i += 1) {
      run(b, 1, { from: t + i / 60 });
      lo = Math.min(lo, dist(b));
      hi = Math.max(hi, dist(b));
    }
    expect(lo).toBeGreaterThan(b.radius * 0.9);
    expect(hi).toBeLessThan(b.radius * 1.1);
    // circling, not parked
    expect(Math.hypot(b.vx, b.vy)).toBeGreaterThan(150);
  });

  it("stays in a loose orbit when restless", () => {
    const b = makeBoid(ORIGIN.x + 110, ORIGIN.y, ORBIT, fixed);
    let t = 0;
    for (let i = 0; i < 10; i += 1) {
      t = run(b, 60, { from: t, rand: Math.random, randomness: 1 });
      expect(dist(b)).toBeGreaterThan(b.base * 0.55);
      expect(dist(b)).toBeLessThan(b.base * 1.8);
    }
  });

  it("turns around now and then", () => {
    // rand() = 0.1 makes every whim a U-turn, the first one about 1.6 s in.
    const rand = uTurn;
    const b = makeBoid(ORIGIN.x + 110, ORIGIN.y, ORBIT, rand);
    const t = run(b, 60, { rand, randomness: 1 });
    const before = Math.sign(spinOf(b));
    run(b, 100, { from: t, rand, randomness: 1 });
    expect(Math.sign(spinOf(b))).toBe(-before);
  });

  it("keeps the ring round around a moving pointer", () => {
    const b = makeBoid(ORIGIN.x + 110, ORIGIN.y, ORBIT, fixed);
    const vel = { x: 300, y: 0 };
    const pointer = (t: number) => ({ x: ORIGIN.x + vel.x * t, y: ORIGIN.y });
    const t = run(b, 120, { pointer, vel });
    let lo = Infinity;
    let hi = 0;
    for (let i = 0; i < 300; i += 1) {
      const now = t + i / 60;
      run(b, 1, { from: now, pointer, vel });
      const d = dist(b, pointer(now));
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
    }
    // Riding along with the pointer instead of trailing behind it like a comet.
    expect(lo).toBeGreaterThan(b.radius * 0.7);
    expect(hi).toBeLessThan(b.radius * 1.3);
  });

  it("can still be caught by a fast pointer", () => {
    const b = makeBoid(ORIGIN.x + 110, ORIGIN.y, ORBIT, fixed);
    const vel = { x: 900, y: 0 };
    const pointer = (t: number) => ({ x: ORIGIN.x + vel.x * t, y: ORIGIN.y });
    let closest = Infinity;
    for (let i = 0; i < 90; i += 1) {
      run(b, 1, { from: i / 60, pointer, vel });
      closest = Math.min(closest, dist(b, pointer(i / 60)));
    }
    // got inside the flee radius, so it scatters
    expect(closest).toBeLessThan(80);
  });

  it("bolts away when the pointer comes close", () => {
    const b = makeBoid(ORIGIN.x + 20, ORIGIN.y, ORBIT, fixed);
    run(b, 10);
    expect(dist(b)).toBeGreaterThan(20);
    // pushed outward, along +x
    expect(b.x - ORIGIN.x).toBeGreaterThan(20);
  });

  it("flees harder from a pointer moving toward it", () => {
    const calm = makeBoid(ORIGIN.x + 40, ORIGIN.y, ORBIT, fixed);
    const chased = makeBoid(ORIGIN.x + 40, ORIGIN.y, ORBIT, fixed);
    run(calm, 3);
    run(chased, 3, { vel: { x: 1500, y: 0 } });
    expect(dist(chased)).toBeGreaterThan(dist(calm));
  });

  it("keeps cursors from stacking on top of each other", () => {
    const a = makeBoid(ORIGIN.x + 110, ORIGIN.y, ORBIT, fixed);
    const b = makeBoid(ORIGIN.x + 112, ORIGIN.y, ORBIT, fixed);
    const flock = [a, b];
    for (let i = 0; i < 30; i += 1) {
      const params = { fleeRadius: 80, randomness: 0, time: i / 60 };
      for (const x of flock) {
        stepBoid(x, ORIGIN, STILL, flock, params, 1 / 60);
      }
    }
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(10);
  });

  it("gives every cursor its own lane and pace", () => {
    const boids = Array.from({ length: 6 }, () => makeBoid(0, 0, ORBIT));
    expect(new Set(boids.map((b) => b.radius)).size).toBe(6);
    expect(new Set(boids.map((b) => b.speed)).size).toBe(6);
  });
});
