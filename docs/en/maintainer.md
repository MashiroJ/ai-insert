# Maintainer Guide

Regular users do not need these commands.

## Common Commands

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm test:runtime-monitor
pnpm check:public-docs
node packages/cli/dist/index.js mcp
```

## Pre-Release Checks

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm check:versions
pnpm check:public-docs
pnpm check:release-clean
pnpm release:local
```

## Publishing npm Packages

```bash
git switch dev
git switch -c release/vX.Y.Z
pnpm run publish:npm:dry-run
pnpm run publish:npm
```

Publishing should only happen from `release/vX.Y.Z` or `main`. See [../release-flow.md](../release-flow.md) for the full branch and release policy.

## Next Smoke Checks

Next project detection and setup guidance should be verified with the two example projects:

1. In `examples/next-app-router`, start MCP and call `start_ui_inspect`.
2. Confirm `integration.projectType` is `next` and `integration.router` is `app`.
3. Confirm `integration.missing` is empty. If the example is intentionally changed to an incomplete state, it should accurately report missing `@ui-inspect/next`, `UiInspectScript`, or `diana-route`.
4. Confirm the App Router setup remains `UiInspectScript` plus `GET`.
5. Repeat in `examples/next-pages-router` and confirm `integration.router` is `pages`.
6. Confirm the Pages Router setup remains `UiInspectScript` plus `dianaHandler`.
7. If `snippets` are returned, confirm they match the public API.

## Package Topology

```text
protocol -> shared / server / browser-adapter -> browser-ui -> integrations -> cli
```

Integrations include Vite, Next.js, Webpack, Rspack, and Rsbuild.
