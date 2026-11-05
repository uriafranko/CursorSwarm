# Contributing

| Path                                                         | What                                            |
| ------------------------------------------------------------ | ----------------------------------------------- |
| [`packages/react-cursor-swarm`](packages/react-cursor-swarm) | The published package                           |
| [`examples/demo`](examples/demo)                             | Vite demo app that consumes the package by name |

## Develop

Needs Node 20.19+ (22 recommended, as in CI).

```bash
npm install
npm run dev     # builds the package in watch mode + starts the demo at http://localhost:5178
```

| Script              |                                                                            |
| ------------------- | -------------------------------------------------------------------------- |
| `npm run dev`       | Package (`tsup --watch`) and demo (Vite) together                          |
| `npm test`          | Unit and component tests (Vitest + jsdom)                                  |
| `npm run lint`      | ESLint (typescript-eslint, react-hooks)                                    |
| `npm run typecheck` | TypeScript for the package and the demo                                    |
| `npm run format`    | Prettier                                                                   |
| `npm run check`     | Everything CI runs: format check, lint, typecheck, tests, publint and attw |

The demo depends on `"react-cursor-swarm": "*"`, which npm workspaces link to `packages/react-cursor-swarm`. It imports the package's built `dist/` through its `exports` map, exactly like an app installing it from npm would.

## Release

1. Bump `version` in `packages/react-cursor-swarm/package.json` and add an entry to its `CHANGELOG.md`.
2. From `packages/react-cursor-swarm`, run `npm publish`. `prepublishOnly` typechecks, tests, builds and validates the package (publint + are-the-types-wrong) first.

Before the first publish, add `repository`, `homepage`, `bugs` and `author` to the package's `package.json` once the GitHub repo exists.
