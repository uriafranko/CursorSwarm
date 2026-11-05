# Agent notes

## Releasing to npm

Read [RELEASING.md](RELEASING.md) before publishing `react-cursor-swarm`. The short version:

- Releases publish from GitHub Actions when a `vX.Y.Z` tag is pushed, using npm trusted publishing. Never run `npm publish` locally and never add npm tokens or secrets.
- Pushing the tag publishes publicly and permanently. Confirm the exact version with the user first.
- The working tree may hold other in-progress work. Commit only the release files, never `git add -A` or `git commit -a`.
