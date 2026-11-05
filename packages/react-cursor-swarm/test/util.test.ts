import { describe, expect, it } from "vitest";
import { alphaOf, intersect } from "../src/core/util";

describe("alphaOf", () => {
  it.each([
    ["transparent", 0],
    ["rgb(1, 2, 3)", 1],
    ["rgba(1, 2, 3, 0.25)", 0.25],
    ["rgba(0, 0, 0, 0)", 0],
    ["rgb(1 2 3 / 40%)", 0.4],
    ["oklch(0.7 0.1 200 / 0.5)", 0.5],
    ["color(srgb 1 0 0)", 1],
    ["", 0],
  ])("%s → %s", (color, alpha) => {
    expect(alphaOf(color)).toBeCloseTo(alpha);
  });
});

describe("intersect", () => {
  it("returns the overlap", () => {
    expect(intersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toEqual({ x: 5, y: 5, w: 5, h: 5 });
  });
  it("counts touching edges", () => {
    expect(intersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 })).toEqual({ x: 10, y: 0, w: 0, h: 5 });
  });
  it("returns null when apart", () => {
    expect(intersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 5, h: 5 })).toBeNull();
  });
});
