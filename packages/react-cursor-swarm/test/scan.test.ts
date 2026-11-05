import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { scan, type Layer } from "../src/core/scan";
import { fakeHighlights, fakeLayout, html } from "./helpers";

beforeAll(() => {
  fakeLayout();
  fakeHighlights();
});
beforeEach(() => {
  document.body.innerHTML = "";
});

const opts = { detail: "full" as const, duplicates: true, maxLayers: 300 };
const kinds = (layers: Layer[]) => layers.map((l) => `${l.kind}:${l.el.tagName.toLowerCase()}`);

describe("scan", () => {
  it("classifies boxes, media, lines and text", () => {
    const root = html(`
      <section>
        <div class="card" style="background-color: rgb(255, 255, 255)">
          <h3>Title</h3>
          <img src="x.png" alt="">
        </div>
        <div style="border-bottom: 1px solid rgb(0, 0, 0)"></div>
        <hr>
        <p>Plain <strong>text</strong></p>
      </section>`);
    const layers = scan([root], opts);
    expect(kinds(layers)).toEqual(["box:div", "media:img", "line:div", "line:hr", "text:h3", "text:p"]);
    const p = layers.find((l) => l.el.tagName === "P")!;
    expect(p.text!.nodes.map((n) => n.data).join("")).toBe("Plain text");
    expect(layers.find((l) => l.el.tagName === "H3")!.parent?.el.className).toBe("card");
  });

  it("turns repeated siblings into one master plus duplicates", () => {
    const root = html(`
      <ul>
        <li class="row" style="background-color: rgb(240, 240, 240)"><b>One</b></li>
        <li class="row" style="background-color: rgb(240, 240, 240)"><b>Two</b></li>
        <li class="row" style="background-color: rgb(240, 240, 240)"><b>Three</b></li>
      </ul>`);
    const layers = scan([root], opts);
    const dups = layers.filter((l) => l.kind === "dup");
    expect(dups).toHaveLength(2);
    expect(dups.every((d) => d.master === root.children[0])).toBe(true);
    const texts = layers.filter((l) => l.kind === "text");
    expect(texts.map((t) => !!t.fast)).toEqual([false, true, true]);
  });

  it("skips hidden things and honours data-swarm-skip", () => {
    const root = html(`
      <div>
        <div style="display: none; background-color: red">gone</div>
        <div style="visibility: hidden; background-color: red">hidden</div>
        <div data-swarm-skip style="background-color: red"></div>
        <div style="background-color: rgba(0, 0, 0, 0)">transparent</div>
      </div>`);
    expect(kinds(scan([root], opts))).toEqual(["text:div"]);
  });

  it("ignores elements too small to see", () => {
    const root = html(
      `<div><span data-w="1" data-h="1" style="display:inline-block;background-color:red"></span></div>`,
    );
    expect(scan([root], opts)).toHaveLength(0);
  });

  it("respects maxLayers", () => {
    const root = html(`<div>${'<i style="display:block;background-color:red"></i>'.repeat(20)}</div>`);
    expect(scan([root], { ...opts, duplicates: false, maxLayers: 5 })).toHaveLength(5);
  });

  it("outline mode makes one layer per root", () => {
    const root = html(`<div><p style="background-color: red">a</p><p>b</p></div>`);
    expect(kinds(scan([root], { ...opts, detail: "outline" }))).toEqual(["box:div"]);
  });

  it("boxes mode leaves text alone", () => {
    const root = html(`<div style="background-color: red"><p>words</p></div>`);
    expect(kinds(scan([root], { ...opts, detail: "boxes" }))).toEqual(["box:div"]);
  });
});
