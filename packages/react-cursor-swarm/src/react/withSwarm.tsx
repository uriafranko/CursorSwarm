import { forwardRef, type ComponentType, type ForwardedRef } from "react";
import { Swarm, type SwarmProps } from "./Swarm";

export type WithSwarmOptions = Omit<SwarmProps, "children">;

/**
 * Higher-order version of <Swarm>: `const BuiltCard = withSwarm(Card, { trigger: "mount" })`.
 * Per-instance overrides go in the `swarm` prop.
 */
export function withSwarm<P extends object>(Component: ComponentType<P>, options: WithSwarmOptions = {}) {
  type Props = P & { swarm?: WithSwarmOptions };
  const C = Component as ComponentType<Record<string, unknown>>;
  const Wrapped = forwardRef<unknown, Props>(function WithSwarm(props, ref) {
    const { swarm, ...rest } = props as Props;
    return (
      <Swarm {...options} {...swarm}>
        <C {...(rest as Record<string, unknown>)} ref={ref as ForwardedRef<unknown>} />
      </Swarm>
    );
  });
  Wrapped.displayName = `withSwarm(${Component.displayName ?? Component.name ?? "Component"})`;
  return Wrapped;
}
