import { describe, expect, it } from "vitest";
import { canType, TextBlock } from "../src/core/text";

const nodes = (...parts: string[]) => parts.map((p) => document.createTextNode(p));
const typed = (b: TextBlock) => b.steps.map((s) => s.ch).join("");

describe("TextBlock keystrokes", () => {
  it("folds collapsed whitespace into single keystrokes", () => {
    const b = new TextBlock(nodes("\n   Hello   ", "\n  world  "), false);
    expect(typed(b)).toBe("Hello world ");
    expect(b.length).toBe(12);
  });

  it("keeps every character when whitespace is preserved", () => {
    const b = new TextBlock(nodes("a  b"), true);
    expect(typed(b)).toBe("a  b");
  });

  it("never splits a surrogate pair", () => {
    const b = new TextBlock(nodes("hi 👋"), false);
    expect(b.steps.map((s) => s.ch)).toEqual(["h", "i", " ", "👋"]);
    expect(b.steps.at(-1)!.o).toBe(5);
  });

  it("spans several text nodes in order", () => {
    const b = new TextBlock(nodes("A ", "bold", " move"), false);
    expect(typed(b)).toBe("A bold move");
    expect(b.steps.at(-1)).toMatchObject({ n: 2, o: 5 });
  });
});

describe("without the Highlight API", () => {
  it("reports that typing is unavailable and refuses to hide", () => {
    expect(canType()).toBe(false);
    const p = document.createElement("p");
    p.append(...nodes("hello"));
    expect(new TextBlock(Array.from(p.childNodes) as Text[], false).hide()).toBe(false);
  });
});
