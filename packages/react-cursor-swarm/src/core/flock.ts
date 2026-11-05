import type { Point } from "./util";

/** A cursor's flocking state. Positions in viewport px, velocities in px/s, times in engine seconds. */
export interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Preferred distance from the pointer right now. Eases toward `lane`. */
  radius: number;
  /** Orbit distance this cursor joined with. New lanes are picked around it. */
  base: number;
  /** Distance the cursor is drifting toward. Re-rolled now and then. */
  lane: number;
  /** Orbit direction it is heading for: 1 clockwise, -1 counter-clockwise. */
  dir: 1 | -1;
  /** Smoothed direction, -1…1, so a reversal slows down and swings round instead of snapping. */
  spin: number;
  /** Cruising speed along the orbit. */
  speed: number;
  /** Extra speed from a recent dash, as a fraction of `speed`. Decays to 0. */
  boost: number;
  /** Personal noise phases and tempo, so no two cursors move in lockstep. */
  seed: [number, number, number];
  tempo: number;
  /** When this cursor next changes its mind. -1 until its first step. */
  next: number;
}

export interface BoidOptions {
  /** Orbit distance around the pointer, px. Each cursor gets its own lane around it. */
  radius: number;
  /** Average speed along the orbit, px/s. */
  speed: number;
}

export interface FlockParams {
  /** The pointer gets this close and the cursor scatters. */
  fleeRadius: number;
  /** Engine clock in seconds. */
  time: number;
  /** 0: steady circles. 1: restless, with frequent dashes, lane changes and U-turns. Default 0.6. */
  randomness?: number;
  rand?: () => number;
}

const SPRING = 2.2; // radial pull back onto the lane, per second
const GRIP = 8; // how fast velocity follows the steering target while orbiting, per second
const FLEE_GRIP = 14;
const FOLLOW = 0.75; // share of the pointer's motion the ring rides along with: round at a stroll, catchable at a dash
const SEPARATION = 38; // px between cursors before they push apart
const CRUISE = 1300; // max speed while orbiting or flying in
const BOLT = 2000; // max speed while fleeing

const TAU = Math.PI * 2;

/** Smooth, never-repeating wobble in about -1…1: three sines at unrelated frequencies. */
function wobble(t: number, a: number, b: number) {
  return (Math.sin(t * 1.13 + a) + 0.6 * Math.sin(t * 2.37 + b) + 0.35 * Math.sin(t * 4.71 + a - b)) / 1.95;
}

export function makeBoid(x: number, y: number, o: BoidOptions, rand: () => number = Math.random): Boid {
  const radius = o.radius * (0.85 + rand() * 0.55);
  const dir = rand() < 0.75 ? 1 : -1;
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius,
    base: radius,
    lane: radius,
    dir,
    spin: dir,
    speed: o.speed * (0.75 + rand() * 0.55),
    boost: 0,
    seed: [rand() * TAU, rand() * TAU, rand() * TAU],
    tempo: 0.75 + rand() * 0.6,
    next: -1,
  };
}

/** A random change of mind: turn around, drift to another lane, or dash ahead. */
function whim(b: Boid, rand: () => number, k: number) {
  const roll = rand();
  if (roll < 0.25) b.dir = b.dir === 1 ? -1 : 1;
  else if (roll < 0.6) b.lane = b.base * (1 + (rand() * 2 - 0.6) * 0.32 * k);
  else b.boost = (0.4 + rand() * 0.6) * k;
}

/**
 * One integration step: orbit the pointer on a round, slightly restless path, keep apart from
 * neighbours, and bolt away (harder when the pointer is moving toward the cursor) once it gets
 * within `fleeRadius`.
 */
export function stepBoid(
  b: Boid,
  pointer: Point,
  pointerVel: Point,
  flock: readonly Boid[],
  p: FlockParams,
  dt: number,
) {
  const rand = p.rand ?? Math.random;
  const k = Math.max(0, Math.min(1, p.randomness ?? 0.6));

  // Every few seconds each cursor changes its mind. More randomness, more often.
  if (b.next < 0 || (k > 0 && p.time >= b.next)) {
    if (b.next >= 0) whim(b, rand, k);
    b.next = p.time + (1.8 + rand() * 3.4) / (0.35 + k);
  }
  b.radius += (b.lane - b.radius) * Math.min(1, dt * 1.4);
  b.spin += (b.dir - b.spin) * Math.min(1, dt * 3.2);
  b.boost *= Math.exp(-dt * 1.6);

  const dx = b.x - pointer.x;
  const dy = b.y - pointer.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const nx = dx / dist;
  const ny = dy / dist;
  const fleeing = dist < p.fleeRadius;

  const t = p.time * b.tempo;
  const ring = b.radius * (1 + 0.14 * k * wobble(t * 0.9, b.seed[0], b.seed[1]));
  const along = b.speed * (1 + 0.3 * k * wobble(t * 0.7, b.seed[1], b.seed[2]) + b.boost) * b.spin;
  // Steering lags the target a little, which would let a fast orbit drift wide; lean inward
  // by the centripetal pull it needs so the path stays on a true circle.
  const lean = fleeing ? 0 : (along * along) / (Math.max(dist, 40) * GRIP);
  const radial = (ring - dist) * SPRING - lean;
  let wantX = -ny * along + nx * radial;
  let wantY = nx * along + ny * radial;

  if (fleeing) {
    const f = 1 - dist / p.fleeRadius;
    const approach = Math.max(0, pointerVel.x * nx + pointerVel.y * ny);
    const push = 1000 * f * f + approach * 1.4 * f;
    wantX += nx * push;
    wantY += ny * push;
  } else {
    // Ride along with the pointer so the ring moves with it instead of smearing into a comet.
    wantX += pointerVel.x * FOLLOW;
    wantY += pointerVel.y * FOLLOW;
  }

  for (const o of flock) {
    if (o === b) continue;
    const ox = b.x - o.x;
    const oy = b.y - o.y;
    const d = Math.hypot(ox, oy);
    if (d > 0 && d < SEPARATION) {
      const s = (1 - d / SEPARATION) * 260;
      wantX += (ox / d) * s;
      wantY += (oy / d) * s;
    }
  }

  const grip = Math.min(1, (fleeing ? FLEE_GRIP : GRIP) * dt);
  b.vx += (wantX - b.vx) * grip;
  b.vy += (wantY - b.vy) * grip;
  const max = fleeing ? BOLT : CRUISE;
  const v = Math.hypot(b.vx, b.vy);
  if (v > max) {
    b.vx *= max / v;
    b.vy *= max / v;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}
