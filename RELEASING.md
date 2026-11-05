# Releasing `react-cursor-swarm`

Releases are published by GitHub Actions, not from a laptop. Pushing a `vX.Y.Z` tag runs [`.github/workflows/publish.yml`](.github/workflows/publish.yml), which publishes `packages/react-cursor-swarm` to npm through **npm trusted publishing** (OIDC). There is no npm token anywhere: no repo secret, no `.npmrc`. Every release gets a provenance attestation linking it to the commit and workflow run.

What the workflow does:

1. Installs dependencies with `npm ci`.
2. Fails unless the tag equals `v` + the `version` in `packages/react-cursor-swarm/package.json`.
3. Runs `npm publish --provenance --access public`. That triggers `prepublishOnly`: typecheck, tests, build, publint and attw. If any of these fail, nothing is published.

## Release steps

Run these from the repo root on an up-to-date `main`, with everything you want to ship already committed and pushed.

**1. Look at what's published and what changed.**

```bash
git pull --ff-only
npm view react-cursor-swarm versions
git log --oneline "v$(npm view react-cursor-swarm version)"..HEAD -- packages/react-cursor-swarm
```

**2. Agree on the version with the user.** Pushing the tag publishes publicly, and a version number can never be reused, even after an unpublish. Get an explicit go-ahead for the exact version before step 6. Under 0.x, a caret range like `^0.1.0` won't install `0.2.0`, so a minor bump is how breaking changes ship.

**3. Run the full check.**

```bash
npm run check
```

**4. Bump the version.** Use `patch`, `minor`, `major` or an exact version:

```bash
(cd packages/react-cursor-swarm && npm version patch --no-git-tag-version)
```

This changes only `packages/react-cursor-swarm/package.json` and the root `package-lock.json`. It makes no commit and no tag.

**5. Update the changelog.** Add a section at the top of [`packages/react-cursor-swarm/CHANGELOG.md`](packages/react-cursor-swarm/CHANGELOG.md): `## X.Y.Z (YYYY-MM-DD)`, then user-facing changes as bullets.

**6. Commit only the release files, then tag and push.** The working tree may contain unrelated in-progress work, so never use `git add -A`, `git add .` or `git commit -a`.

```bash
git add packages/react-cursor-swarm/package.json packages/react-cursor-swarm/CHANGELOG.md package-lock.json
git commit -m "Release vX.Y.Z"
git tag -a vX.Y.Z -m "react-cursor-swarm X.Y.Z"
git push origin main vX.Y.Z
```

**7. Watch the run and confirm.**

```bash
gh run list --workflow publish.yml --limit 1
gh run watch <run-id> --exit-status
npm view react-cursor-swarm version
```

## Rules

- **Never run `npm publish` locally.** It would publish whatever is in the working tree, including uncommitted changes, with no provenance. The npm account also needs the owner's two-factor confirmation for a local publish.
- **Never add an npm token** (`NPM_TOKEN` or similar) to the repo or workflow. Tokens that bypass two-factor authentication can only stage publishes now (`E_STAGE_REQUIRED`), and trusted publishing makes them unnecessary.
- **Don't rename `publish.yml` or add a GitHub `environment:` to its job** without first updating the trusted publisher on npmjs.com. It's registered as GitHub Actions, repository `uriafranko/CursorSwarm`, workflow `publish.yml`, no environment. The job also needs `permissions: id-token: write` and npm ≥ 11.5.1.
- **No pre-releases yet.** The workflow publishes every version under the `latest` dist-tag, so `vX.Y.Z-beta.N` would become the default install. Before shipping one, change the workflow to pass `--tag next` for versions containing `-`.
- **Bad release:** publish a fixed version. To warn installers off the bad one, the owner runs `npm deprecate react-cursor-swarm@X.Y.Z "<reason>"` (it needs their two-factor confirmation).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Tag vX.Y.Z does not match package.json version` | The tag is on a commit without the bump. Nothing was published. Delete the tag (`git push origin :refs/tags/vX.Y.Z && git tag -d vX.Y.Z`), fix, then tag and push again. |
| A check fails inside `npm publish` | Nothing was published. Fix it on `main`, then move the tag to the fixed commit the same way. `gh run rerun` reuses the old commit, so it only helps with flaky failures. |
| Auth error on publish (`ENEEDAUTH`, or 403/404 on `PUT`) | Trusted publisher mismatch. Check `npm trust list react-cursor-swarm` (the owner must be logged in) against the workflow's repo and filename, and that `id-token: write` is still set. |
| `cannot publish over the previously published versions` | That version is already on npm. Bump again. |
| `git push` rejected: `refusing to allow an OAuth App to create or update workflow ... without workflow scope` | Happens only when a push changes `.github/workflows/`. The owner runs `gh auth refresh -s workflow`. |
| `npm warn Unknown user config "always-auth"` in the log | Harmless. It comes from the `.npmrc` that `actions/setup-node` writes. |

## History

`0.1.0` was published by hand on 2026-11-05, because trusted publishing can only be set up for a package that already exists on npm. Every release after that goes through the workflow.
