# react-cursor-swarm

Wrap any React component and a swarm of multiplayer cursors builds it, live:

- **Boxes** are drawn with a crosshair drag. A live `W × H` badge and a placeholder show during the drag, then the real element fades in.
- **Text** is typed in place with an I-beam and a blinking caret.
- **Images, SVGs and video** sweep in top to bottom.
- **Single-side borders and `<hr>`** are drawn with the pen tool.
- **Repeated siblings** (cards or rows from a `.map()`) are **⌥-dragged** from the first one, with red spacing measurements.
- **Optional finale:** when everything on screen is built, the swarm **flocks around the user's pointer** and scatters when the pointer comes close.

It animates **your real DOM**, not a snapshot. When the cursors leave, the component is just your component: state, events, inputs and styles are untouched.

```tsx
import { Swarm } from "react-cursor-swarm";

<Swarm>
  <PricingCard />
</Swarm>;
```

## Install

```bash
npm install react-cursor-swarm
```

Peer dependency: React 18 or 19. No other runtime dependencies. Ships ESM and CJS with TypeScript types, and is marked `"use client"` for the Next.js app router.

## Usage

### Wrap a component

```tsx
import { Swarm } from "react-cursor-swarm";

export function Page() {
  return (
    <>
      <Swarm trigger="mount">
        <Navbar />
      </Swarm>
      <Swarm>
        {/* builds when scrolled into view (default) */}
        <FeatureGrid />
      </Swarm>
    </>
  );
}
```

The wrapper renders a `<div style="display: contents">`, so it doesn't change your layout. Pass `as="section"` and your own `style` to change that.

### Or use the HOC

```tsx
import { withSwarm } from "react-cursor-swarm";

const BuiltStatCard = withSwarm(StatCard, { trigger: "visible" });

<BuiltStatCard label="Revenue" value="$12k" swarm={{ delay: 200 }} />;
```

### Configure the swarm (optional)

Every `<Swarm>` inside a provider shares one pool of cursors, so the same cursors hop from component to component as you scroll.

```tsx
import { SwarmProvider } from "react-cursor-swarm";

<SwarmProvider agents={10} speed={1.5} detail="boxes" labels>
  <App />
</SwarmProvider>;
```

Without a provider, a default engine is used. `detail` on the provider sets the default for every `<Swarm>` inside it. A component's own `detail` prop still wins.

Every option can change at any time. `agents` takes effect right away: raise it and more cursors join while there's work, lower it and the extras fly off (a busy cursor finishes its current layer first). Outside React, call `engine.setAgents(n)`.

### Flock finale

```tsx
<SwarmProvider finale="flock" flock={{ radius: 120, fleeRadius: 90, speed: 300, randomness: 0.8 }}>
  <App />
</SwarmProvider>
```

Once nothing on screen is left to build, idle cursors gather around the user's pointer and orbit it in round loops that ride along as the pointer moves. Each cursor has its own lane and pace, and every few seconds it changes its mind: it dashes ahead, drifts to a wider or tighter lane, or swings into a U-turn. `randomness` sets how restless they are, from steady circles (`0`) to fidgety (`1`). Dash toward them and they scatter, faster the faster you come at them, then drift back into orbit. The flock breaks up as soon as there's new work (say, a section scrolls into view), and re-forms when that work is done.

You can also drive it yourself, whatever `finale` is set to:

```tsx
const engine = useSwarmEngine();
engine.flock(); // gather around the pointer now
engine.dismiss(); // send everyone off screen
```

### Control it

```tsx
const ref = useRef<SwarmHandle>(null);

<Swarm ref={ref} trigger="manual" active={isOpen} onBuildComplete={() => setReady(true)}>
  <Modal />
</Swarm>;

ref.current?.replay(); // rebuild from scratch
ref.current?.reveal(); // skip to the end
```

```tsx
const engine = useSwarmEngine(); // replayAll(), revealAll(), setSpeed(2), setAgents(4), flock(), dismiss()
const { agents, done, total, team, flocking } = useSwarmStats(); // for a progress HUD
```

## API

### `<Swarm>` props

| Prop                              | Default     |                                                                                                                                                                                  |
| --------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trigger`                         | `"visible"` | `"visible"` builds when the component scrolls into view, `"mount"` builds right away, `"manual"` builds when `active` is true or you call `ref.build()`                          |
| `active`                          |             | With `trigger="manual"`: stays hidden while false, builds each time it turns true                                                                                                |
| `detail`                          | provider's  | `"full"`: boxes, media, lines, typed text, duplicates. `"boxes"`: no typing; text appears with its container. `"outline"`: one drag around the whole component, then it fades in |
| `duplicates`                      | `true`      | Detect repeated siblings and ⌥-drag copies of the first one                                                                                                                      |
| `delay`                           | `0`         | ms to wait before starting                                                                                                                                                       |
| `maxLayers`                       | `300`       | Animated layers per component; anything past the cap appears with its parent                                                                                                     |
| `disabled`                        | `false`     | Render children with no animation                                                                                                                                                |
| `as`                              | `"div"`     | Wrapper element (`display: contents` unless you override `style`)                                                                                                                |
| `onBuildStart`, `onBuildComplete` |             | Callbacks                                                                                                                                                                        |

Ref handle (`SwarmHandle`): `build()`, `replay()`, `reveal()`.

### `<SwarmProvider>` options

| Option                 | Default      |                                                                                     |
| ---------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `agents`               | `8`          | Max cursors on screen. They join as work becomes available and fly off when idle    |
| `speed`                | `1`          | Build speed multiplier. The flock finale always moves at 1×                         |
| `labels`               | `true`       | Name tags next to cursors                                                           |
| `names`, `colors`      | built-in     | Cursor roster                                                                       |
| `detail`               | `"full"`     | Default `detail` for every `<Swarm>` inside (see `<Swarm>` props)                   |
| `respectReducedMotion` | `true`       | Users with `prefers-reduced-motion` get the finished component at once              |
| `zIndex`               | `2147483000` | z-index of the cursor overlay                                                       |
| `finale`               | `"leave"`    | What idle cursors do: `"leave"` flies them off screen, `"flock"` orbits the pointer |
| `flock`                | `{}`         | Flock tuning, see below                                                             |

`flock` options:

| Option       | Default          |                                                                                 |
| ------------ | ---------------- | ------------------------------------------------------------------------------- |
| `radius`     | `110`            | Orbit distance around the pointer, px. Each cursor picks its own lane around it |
| `speed`      | `260`            | Average speed along the orbit, px/s. Independent of the provider's `speed`      |
| `randomness` | `0.6`            | `0` to `1`: from steady circles to frequent dashes, lane changes and U-turns    |
| `fleeRadius` | `80`             | How close the pointer can get before cursors scatter, px                        |
| `duration`   | until next build | How long the flock stays before flying off, ms                                  |
| `size`       | `agents`         | More cursors join until the flock has this many                                 |

### Per-element control

- `data-swarm-skip` on any element: don't animate it. It appears with its parent.

## How it works

1. **Scan.** When a build starts, the wrapped subtree is walked once and split into layers:
   - elements with a background, two or more borders, a shadow or a backdrop blur become **boxes**
   - `img`, `svg`, `video`, `canvas`, `iframe` and `url()` backgrounds become **media**
   - elements with a single border side, and `<hr>`, become **pen lines**
   - text runs, grouped by their block container, become **text**
   - consecutive siblings with the same tag, class and child structure become one **master** plus **duplicates**
2. **Hide.** Boxes, media and lines get a `data-swarm-hide` attribute (`visibility: hidden`, so layout never moves). Text stays in the DOM and is painted transparent with the [CSS Custom Highlight API](https://developer.mozilla.org/docs/Web/API/CSS_Custom_Highlight_API). Typing shrinks the highlight one character at a time, so text is "typed" in its final position with zero reflow and no DOM mutation that React could fight with.
3. **Build.** Cursors pick up tasks top-down as they come on screen. Children wait for their parent box, and duplicates wait for their master to be fully built. Selections, badges, carets and ghosts are drawn in a fixed overlay inside a shadow root, isolated from your CSS. They are re-measured every frame, so they follow scrolling, inner scroll containers and `overflow: hidden` clipping.
4. **Done.** Every attribute and highlight is removed. Nothing is left behind.

The core (`SwarmEngine`, `SwarmRoot`) is framework-agnostic. The React components are a thin layer on top:

```ts
import { SwarmRoot, getDefaultEngine } from "react-cursor-swarm";

const root = new SwarmRoot(getDefaultEngine(), () => [document.querySelector("#app")!], { detail: "full" });
root.start();
```

## Notes and limits

- The text-typing effect needs the CSS Custom Highlight API (Chrome 105+, Safari 17.2+, Firefox 140+). Where it's missing, `detail="full"` falls back to `"boxes"`.
- Content rendered through portals isn't inside the wrapper, so it isn't animated.
- Elements that mount _during_ a build appear with their parent box instead of being built separately.
- Pseudo-elements (`::before`/`::after`) and list markers appear with their element.
- With SSR, wrapped content is server-rendered with `visibility: hidden` so it doesn't flash before hydration. If JavaScript never runs, it stays hidden. Use `disabled` for content that must be visible without JS.

## Credit

The idea and the motion language come from **[Swarm](https://califa.github.io/swarm-site/)** by Joel Califa, a website that builds itself as you scroll, and **[swarm-cursors / Swarm Rebuild](https://github.com/DhvanilPatel/swarm-cursors)**, a Chrome extension that rebuilds any page. This package is an independent implementation for React components and contains no code from either project.
