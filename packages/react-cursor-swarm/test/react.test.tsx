import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Swarm, SwarmProvider, withSwarm } from "../src";
import type { SwarmHandle } from "../src";
import { fakeLayout, reducedMotion } from "./helpers";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const Card = ({ title }: { title: string }) => (
  <div className="card" style={{ backgroundColor: "rgb(255, 255, 255)" }}>
    {title}
  </div>
);

const manualView = (active: boolean) => (
  <SwarmProvider>
    <Swarm trigger="manual" active={active}>
      <Card title="later" />
    </Swarm>
  </SwarmProvider>
);

// A box with a bordered box inside: `full` builds both, `outline` only drags around the outside.
const Nested = () => (
  <div className="card" style={{ backgroundColor: "rgb(255, 255, 255)" }}>
    <span style={{ border: "1px solid rgb(0, 0, 0)", display: "block" }} />
  </div>
);
const detailView = (provider: "full" | "outline", own?: "full") => (
  <SwarmProvider detail={provider}>
    <Swarm trigger="mount" detail={own}>
      <Nested />
    </Swarm>
  </SwarmProvider>
);
const hiddenCount = () => document.querySelectorAll("[data-swarm-hide]").length;

describe("react", () => {
  beforeAll(fakeLayout);
  beforeEach(() => {
    reducedMotion(false);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = "";
  });

  describe("server rendering", () => {
    it("renders hidden, so content doesn't flash before hydration", () => {
      const out = renderToString(
        <Swarm>
          <Card title="hi" />
        </Swarm>
      );
      expect(out).toContain("display:contents");
      expect(out).toContain("visibility:hidden");
      expect(out).toContain("hi");
    });

    it("renders plainly when disabled", () => {
      const out = renderToString(
        <Swarm disabled>
          <Card title="hi" />
        </Swarm>
      );
      expect(out).not.toContain("visibility:hidden");
    });
  });

  describe("<Swarm>", () => {
    it("starts building on mount and cleans up on unmount", () => {
      act(() =>
        root.render(
          <SwarmProvider>
            <Swarm trigger="mount">
              <Card title="hello" />
            </Swarm>
          </SwarmProvider>
        )
      );
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.style.visibility).toBe("");
      expect(container.querySelector(".card")?.hasAttribute("data-swarm-hide")).toBeTruthy();
      act(() => root.unmount());
      expect(document.querySelector("[data-swarm-hide]")).toBeNull();
      expect(document.querySelector("[data-swarm-overlay]")).toBeNull();
      root = createRoot(container);
    });

    it("stays hidden until a manual trigger is activated", () => {
      act(() => root.render(manualView(false)));
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.style.visibility).toBe("hidden");
      // Transitions stay off while it's hidden, so nothing inside lingers on screen.
      expect(wrapper.hasAttribute("data-swarm-still")).toBeTruthy();
      act(() => root.render(manualView(true)));
      expect(wrapper.style.visibility).toBe("");
      expect(wrapper.hasAttribute("data-swarm-still")).toBeFalsy();
      expect(container.querySelector(".card")?.hasAttribute("data-swarm-hide")).toBeTruthy();
    });

    it("exposes reveal() and fires the callbacks", () => {
      const ref = createRef<SwarmHandle>();
      const onBuildStart = vi.fn<() => void>();
      const onBuildComplete = vi.fn<() => void>();
      act(() =>
        root.render(
          <SwarmProvider>
            <Swarm ref={ref} trigger="mount" onBuildStart={onBuildStart} onBuildComplete={onBuildComplete}>
              <Card title="x" />
            </Swarm>
          </SwarmProvider>
        )
      );
      expect(onBuildStart).toHaveBeenCalledOnce();
      act(() => ref.current?.reveal());
      expect(onBuildComplete).toHaveBeenCalledOnce();
      expect(document.querySelector("[data-swarm-hide]")).toBeNull();
    });

    it("shows the finished component at once for reduced-motion users", () => {
      reducedMotion(true);
      const onBuildComplete = vi.fn<() => void>();
      act(() =>
        root.render(
          <Swarm trigger="mount" onBuildComplete={onBuildComplete}>
            <Card title="calm" />
          </Swarm>
        )
      );
      expect(onBuildComplete).toHaveBeenCalledOnce();
      expect(document.querySelector("[data-swarm-hide]")).toBeNull();
    });

    it("takes its detail from the provider unless it sets its own", () => {
      act(() => root.render(detailView("full")));
      expect(hiddenCount()).toBe(2);
      act(() => root.render(detailView("outline")));
      expect(hiddenCount()).toBe(1);
      act(() => root.render(detailView("outline", "full")));
      expect(hiddenCount()).toBe(2);
    });
  });

  describe(withSwarm, () => {
    it("wraps a component and forwards its props", () => {
      const Built = withSwarm(Card, { trigger: "mount" });
      expect(Built.displayName).toBe("withSwarm(Card)");
      act(() =>
        root.render(
          <SwarmProvider>
            <Built title="wrapped" />
          </SwarmProvider>
        )
      );
      expect(container.textContent).toBe("wrapped");
      expect(container.querySelector(".card")?.hasAttribute("data-swarm-hide")).toBeTruthy();
    });
  });
});
