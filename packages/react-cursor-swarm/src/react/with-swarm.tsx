import { forwardRef } from "react";
import type { ComponentType, ForwardedRef, PropsWithoutRef } from "react";

import { Swarm } from "./swarm";
import type { SwarmProps } from "./swarm";

export type WithSwarmOptions = Omit<SwarmProps, "children">;

/**
 * Higher-order version of <Swarm>: `const BuiltCard = withSwarm(Card, { trigger: "mount" })`.
 * Per-instance overrides go in the `swarm` prop.
 */
export const withSwarm = <P extends object>(Component: ComponentType<P>, options: WithSwarmOptions = {}) => {
  type Props = P & { swarm?: WithSwarmOptions };
  const C = Component as ComponentType<Record<string, unknown>>;
  const WithSwarm = (props: PropsWithoutRef<Props>, ref: ForwardedRef<unknown>) => {
    const { swarm, ...rest } = props as Props;
    return (
      <Swarm {...options} {...swarm}>
        <C {...(rest as Record<string, unknown>)} ref={ref} />
      </Swarm>
    );
  };
  const Wrapped = forwardRef<unknown, Props>(WithSwarm);
  Wrapped.displayName = `withSwarm(${Component.displayName ?? Component.name ?? "Component"})`;
  return Wrapped;
};
