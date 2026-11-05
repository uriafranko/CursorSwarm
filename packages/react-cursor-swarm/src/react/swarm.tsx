import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ElementType, ForwardedRef, HTMLAttributes, ReactNode } from "react";

import { STILL_ATTR, SwarmRoot } from "../core/root";
import type { Detail } from "../core/scan";
import { useDefaultDetail, useSwarmEngine } from "./context";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type SwarmTrigger = "visible" | "mount" | "manual";

export interface SwarmProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children?: ReactNode;
  /**
   * When to start building.
   * - `visible` (default): when the component scrolls into view
   * - `mount`: right away
   * - `manual`: when `active` becomes true (or `ref.current.build()`)
   */
  trigger?: SwarmTrigger;
  /** With `trigger="manual"`: the component stays hidden while false and is built each time it turns true. */
  active?: boolean;
  /** How finely to take the component apart. Default: the provider's `detail`, which defaults to `full`. */
  detail?: Detail;
  /** Detect repeated siblings (cards, rows) and ⌥-drag copies of the first. Default true. */
  duplicates?: boolean;
  maxLayers?: number;
  /** Delay before building starts, in ms. */
  delay?: number;
  /** Render children as-is, with no animation. */
  disabled?: boolean;
  /** Wrapper element. It uses `display: contents` by default, so it doesn't affect layout. */
  as?: ElementType;
  onBuildStart?: () => void;
  onBuildComplete?: () => void;
}

export interface SwarmHandle {
  /** Start (or restart) the build now. */
  build: () => void;
  /** Hide everything again and rebuild from scratch. */
  replay: () => void;
  /** Skip to the end. */
  reveal: () => void;
}

const elementsOf = (wrapper: HTMLElement): Element[] => {
  if (getComputedStyle(wrapper).display === "contents") {
    return [...wrapper.children];
  }
  return [wrapper];
};

const SwarmComponent = (
  {
    children,
    trigger = "visible",
    active,
    detail: detailProp,
    duplicates = true,
    maxLayers,
    delay = 0,
    disabled = false,
    as: Tag = "div",
    onBuildStart,
    onBuildComplete,
    style,
    ...rest
  }: SwarmProps,
  ref: ForwardedRef<SwarmHandle>
) => {
  const engine = useSwarmEngine();
  const defaultDetail = useDefaultDetail(engine);
  const detail = detailProp ?? defaultDetail;
  const wrapper = useRef<HTMLElement>(null);
  const root = useRef<SwarmRoot | null>(null);
  const [pending, setPending] = useState(!disabled);
  const callbacks = useRef({ onBuildComplete, onBuildStart });
  useIsoLayoutEffect(() => {
    callbacks.current = { onBuildComplete, onBuildStart };
  });
  // With trigger="manual" nothing happens until `active` is true.
  const armed = trigger !== "manual" || !!active;

  const begin = useCallback(() => {
    const w = wrapper.current;
    const r = root.current;
    if (!w || !r) {
      return;
    }
    // Clear the pending style imperatively so the scan sees real visibility; React's
    // re-render below settles on the same value, all before the browser paints.
    w.style.visibility = "";
    r.start();
    setPending(false);
  }, []);

  useIsoLayoutEffect(() => {
    const w = wrapper.current;
    if (disabled || !w) {
      setPending(false);
      return;
    }
    // Re-runs (prop changes, Fast Refresh) go back to hidden until the next build starts.
    setPending(true);
    const r = new SwarmRoot(engine, () => elementsOf(w), {
      detail,
      duplicates,
      maxLayers,
      onComplete: () => callbacks.current.onBuildComplete?.(),
      onStart: () => callbacks.current.onBuildStart?.(),
    });
    root.current = r;

    const scheduled: { timer?: ReturnType<typeof setTimeout> } = {};
    let io: IntersectionObserver | undefined;
    const go = () => {
      if (delay > 0) {
        scheduled.timer = setTimeout(begin, delay);
      } else {
        begin();
      }
    };

    if (!armed) {
      // manual and not active yet: stay hidden
    } else if (trigger !== "visible" || typeof IntersectionObserver === "undefined") {
      go();
    } else {
      const targets = elementsOf(w);
      if (targets.length) {
        io = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              io?.disconnect();
              go();
            }
          },
          { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
        );
        for (const t of targets) {
          io.observe(t);
        }
      } else {
        go();
      }
    }

    return () => {
      clearTimeout(scheduled.timer);
      io?.disconnect();
      r.destroy();
      if (root.current === r) {
        root.current = null;
      }
    };
  }, [engine, disabled, trigger, armed, detail, duplicates, maxLayers, delay, begin]);

  useImperativeHandle(
    ref,
    () => ({
      build: begin,
      replay: begin,
      reveal: () => {
        root.current?.reveal();
        setPending(false);
        if (wrapper.current) {
          wrapper.current.style.visibility = "";
        }
      },
    }),
    [begin]
  );

  const merged: CSSProperties = { display: "contents", ...style };
  if (pending) {
    merged.visibility = "hidden";
  }
  // While pending, transitions inside are off: a `transition-all` button would otherwise stay
  // visible for the length of its transition after the component is hidden (e.g. on a replay).
  const still = pending ? { [STILL_ATTR]: "" } : undefined;

  return (
    <Tag ref={wrapper} data-swarm-root="" {...still} style={merged} {...rest}>
      {children}
    </Tag>
  );
};

/**
 * Wrap any component: it starts hidden and a swarm of cursors builds it, box by box and
 * keystroke by keystroke, on the real DOM. When done it is just your component again.
 */
export const Swarm = forwardRef<SwarmHandle, SwarmProps>(SwarmComponent);
Swarm.displayName = "Swarm";
