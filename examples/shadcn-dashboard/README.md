# shadcn/ui dashboard example

An analytics dashboard built with [shadcn/ui](https://ui.shadcn.com) (Nova preset, Radix, Lucide) and Tailwind CSS v4, wrapped in `react-cursor-swarm`.

```bash
npm install
npm run dev:dashboard   # from the repo root, then open http://localhost:5179
```

What it shows:

- **`<Swarm>` inside a shadcn layout.** The wrapper is `display: contents`, so `SidebarProvider`, `SidebarInset` and CSS grid spans keep working.
- **Mount vs. visible.** Sidebar, header and KPI cards build on mount (staggered with `delay`); the chart, sales list and table build when they scroll into view.
- **Duplicates.** The four KPI cards and the table rows come from `.map()`, so the swarm builds the first one and ⌥-drags the rest.
- **Media.** The Recharts chart is SVG, so it is swept in as one layer.
- **Live provider options.** The floating Swarm panel is plain React state passed to `<SwarmProvider>`: cursors, speed, detail, name tags and the flock finale all change live. It also uses `useSwarmStats()` for progress and `useSwarmEngine()` for _Replay all_, _Skip to end_, `flock()` and `dismiss()`.

The files in `src/components/ui` were generated with `npx shadcn add` and are kept as upstream ships them. `src/hooks/use-mobile.ts` is rewritten with `useSyncExternalStore` so it passes this repo's lint rules.
