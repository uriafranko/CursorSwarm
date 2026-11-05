# shadcn/ui kanban example

A project board built with [shadcn/ui](https://ui.shadcn.com) (Maia preset, Radix, Hugeicons) and Tailwind CSS v4, wrapped in `react-cursor-swarm`. It focuses on building things **on demand**.

```bash
npm install
npm run dev:kanban   # from the repo root, then open http://localhost:5180
```

What it shows:

- **Dialogs and sheets.** shadcn renders `Dialog` and `Sheet` in a portal, so the `<Swarm>` goes _inside_ `DialogContent` / `SheetContent`. Radix mounts the content on open, so the form and the issue details are built every time they open.
- **`onBuildComplete`.** Inputs are hidden while the cursors draw them, so the _New issue_ dialog focuses its title field once the build finishes.
- **New items get built.** An issue you create gets its own `<Swarm trigger="mount">`, so the cursors come back and build just that card.
- **Tabs.** Radix mounts a tab's content when you switch to it, so _Board_ and _List_ rebuild on every switch. The list uses `detail="boxes"` (no typing) to come together quickly.
- **`ref.replay()`.** _Rebuild_ replays whichever view is mounted through a `SwarmHandle` ref.
- **Presence.** The avatar stack in the top bar is `useSwarmStats().team`: the swarm's cursors show up as live collaborators.

The files in `src/components/ui` were generated with `npx shadcn add` and are kept as upstream ships them.
