# Changelog

## 0.1.0 (2026-11-05)

First release.

- `<Swarm>`, `withSwarm()` and `<SwarmProvider>`: cursors build any wrapped component on the real DOM.
- Boxes (crosshair drag with a `W × H` badge), media (top-to-bottom sweep), pen-tool lines, typed text (CSS Custom Highlight API, no reflow) and ⌥-drag duplicates for repeated siblings.
- Triggers: `visible`, `mount`, `manual`. Detail levels: `full`, `boxes`, `outline`.
- `finale: "flock"`: when there's nothing left to build, cursors orbit the pointer in round, restless loops (own lane and pace, random dashes, lane changes and U-turns) and scatter when it gets close. Tune with `flock.speed` and `flock.randomness`. The flock always moves at 1×, whatever the build `speed`.
- `detail` on `<SwarmProvider>` sets the default for every `<Swarm>` inside it.
- `prefers-reduced-motion` support and SSR-safe rendering.
- The `agents` limit can change live, through the provider prop or `engine.setAgents(n)`. When it drops, the extra cursors leave once they're free.
