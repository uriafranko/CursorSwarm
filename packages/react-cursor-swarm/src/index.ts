export { Swarm, type SwarmProps, type SwarmHandle, type SwarmTrigger } from "./react/swarm";
export { withSwarm, type WithSwarmOptions } from "./react/with-swarm";
export { SwarmProvider, useSwarmEngine, useSwarmStats, type SwarmProviderProps } from "./react/context";

// Framework-agnostic core, for non-React use or custom integrations.
export {
  SwarmEngine,
  getDefaultEngine,
  DEFAULT_COLORS,
  DEFAULT_NAMES,
  type SwarmOptions,
  type SwarmStats,
  type Finale,
  type FlockOptions,
} from "./core/engine";
export { SwarmRoot, type RootOptions } from "./core/root";
export type { Detail } from "./core/scan";
export type { CursorMode } from "./core/cursors";
