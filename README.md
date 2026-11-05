# react-cursor-swarm

Wrap any React component and a swarm of multiplayer cursors builds it live. They drag out the boxes, type the text and ⌥-drag repeated cards into place. When they leave, it's just your component again.

![react-cursor-swarm building a landing page](docs/demo.gif)

▶ **[Watch the full demo (44s)](docs/demo.mp4)**

## Install

```bash
npm install react-cursor-swarm
```

Works with React 18 and 19. No other dependencies.

## Quick start

```tsx
import { Swarm } from "react-cursor-swarm";

<Swarm>
  <PricingCard />
</Swarm>;
```

That's all you need. The card builds when it scrolls into view.

## Examples

### Build on mount instead of on scroll

```tsx
<Swarm trigger="mount">
  <Navbar />
</Swarm>
```

### Configure the swarm

One provider shares its cursors with every `<Swarm>` inside it, so the same cursors follow you down the page.

```tsx
import { SwarmProvider } from "react-cursor-swarm";

<SwarmProvider agents={10} speed={1.5}>
  <App />
</SwarmProvider>;
```

### Flock to the pointer when done

```tsx
<SwarmProvider finale="flock">
  <App />
</SwarmProvider>
```

When nothing is left to build, the cursors orbit the user's pointer and scatter if it rushes them.

### Build on demand

```tsx
import { useRef } from "react";
import { Swarm, type SwarmHandle } from "react-cursor-swarm";

const ref = useRef<SwarmHandle>(null);

<Swarm ref={ref} trigger="manual" active={isOpen} onBuildComplete={() => console.log("built")}>
  <Modal />
</Swarm>;

ref.current?.replay(); // build again from scratch
ref.current?.reveal(); // skip to the end
```

### Wrap a component once (HOC)

```tsx
import { withSwarm } from "react-cursor-swarm";

const BuiltStatCard = withSwarm(StatCard, { trigger: "visible" });

<BuiltStatCard label="Revenue" value="$12k" />;
```

### Show progress

```tsx
import { useSwarmStats } from "react-cursor-swarm";

function BuildProgress() {
  const { building, done, total } = useSwarmStats();
  return <span>{building ? `${done}/${total} layers` : "Idle"}</span>;
}
```

### Without React

```ts
import { SwarmRoot, getDefaultEngine } from "react-cursor-swarm";

const root = new SwarmRoot(getDefaultEngine(), () => [document.querySelector("#app")!]);
root.start();
```

## Options

| `<Swarm>` prop    | Default     |                                                           |
| ----------------- | ----------- | --------------------------------------------------------- |
| `trigger`         | `"visible"` | `"visible"`, `"mount"` or `"manual"`                      |
| `detail`          | `"full"`    | `"full"`, `"boxes"` (no typing) or `"outline"` (one drag) |
| `delay`           | `0`         | ms to wait before building                                |
| `disabled`        | `false`     | Render the children with no animation                     |
| `onBuildComplete` |             | Called when the component is fully built                  |

| `<SwarmProvider>` option | Default   |                                          |
| ------------------------ | --------- | ---------------------------------------- |
| `agents`                 | `8`       | Max cursors on screen                    |
| `speed`                  | `1`       | Build speed multiplier                   |
| `finale`                 | `"leave"` | `"leave"` or `"flock"` when work is done |
| `labels`                 | `true`    | Name tags next to cursors                |

Skip any element with `data-swarm-skip`. Users with `prefers-reduced-motion` see the finished component right away.

The full API, flock tuning and how it works are in the [package docs](packages/react-cursor-swarm/README.md).

## Run the demo

```bash
npm install
npm run dev
```

Then open http://localhost:5178. See [CONTRIBUTING.md](CONTRIBUTING.md) for scripts and releasing.

## License

MIT
