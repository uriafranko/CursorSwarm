import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { getDefaultEngine, SwarmEngine, type SwarmOptions, type SwarmStats } from "../core/engine";
import type { Detail } from "../core/scan";

const SwarmContext = createContext<SwarmEngine | null>(null);
// The provider's `detail` travels by context (not just engine options) so a change re-renders every <Swarm>.
const DetailContext = createContext<Detail | undefined>(undefined);

export interface SwarmProviderProps extends SwarmOptions {
  children?: ReactNode;
}

/**
 * Optional. Shares one cursor pool and overlay between every <Swarm> inside it and lets you
 * configure the swarm. Without a provider, components use a default engine.
 */
export function SwarmProvider({ children, ...options }: SwarmProviderProps) {
  const [engine] = useState(() => new SwarmEngine(options));
  // Cheap and idempotent: the engine compares values, so inline arrays/objects are fine.
  useEffect(() => {
    engine.setOptions(options);
  });
  useEffect(() => () => engine.dispose(), [engine]);
  return (
    <SwarmContext.Provider value={engine}>
      <DetailContext.Provider value={options.detail}>{children}</DetailContext.Provider>
    </SwarmContext.Provider>
  );
}

/** The engine for this subtree (from the nearest <SwarmProvider>, or the default one). */
export function useSwarmEngine(): SwarmEngine {
  return useContext(SwarmContext) ?? getDefaultEngine();
}

/** The `detail` a <Swarm> uses when it doesn't set its own. */
export function useDefaultDetail(engine: SwarmEngine): Detail {
  return useContext(DetailContext) ?? engine.options.detail;
}

const EMPTY: SwarmStats = { agents: 0, done: 0, total: 0, building: 0, team: [], flocking: false };

/** Live counts for building a HUD: cursors on screen, layers built / total. */
export function useSwarmStats(): SwarmStats {
  const engine = useSwarmEngine();
  return useSyncExternalStore(engine.subscribe, engine.getStats, () => EMPTY);
}
