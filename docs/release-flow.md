# Release Flow

This project uses `dev` for day-to-day development and `main` for stable release history.

## Branch Rules

- Develop features, fixes, experiments, and cleanup work on `dev`.
- Do not merge ordinary development commits from `dev` to `main`.
- Prepare a release from `dev` by creating `release/vX.Y.Z`.
- Bump package versions only on a `release/vX.Y.Z` branch.
- Publish npm packages only from `release/vX.Y.Z` or `main`.
- After publish succeeds, merge the release branch to `main`, tag `vX.Y.Z`, and push `main` plus the tag.
- If the release branch contains version, documentation, or script fixes, merge it back to `dev`.

## Release Checklist

From `dev`:

```bash
git switch dev
git pull --rebase
git switch -c release/vX.Y.Z
```

On `release/vX.Y.Z`:

```bash
pnpm run check:versions
pnpm run check:public-docs
pnpm run check:release-clean
pnpm run test
pnpm run typecheck
pnpm run build
pnpm run publish:npm:dry-run
pnpm run publish:npm
```

After npm publish succeeds:

```bash
git switch main
git merge --ff-only release/vX.Y.Z
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
git switch dev
git merge --ff-only release/vX.Y.Z
git push origin dev
```

## Public Documentation

- README is user-facing and should use `@latest` instead of concrete npm versions.
- Exact versions belong in package manifests, npm, git tags, changelogs, GitHub Releases, and local generated release notes.
- `release/` is a local packaging output directory and must not be committed.
