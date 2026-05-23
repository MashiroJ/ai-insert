# 维护者指南

普通用户不需要执行这里的命令。

## 常用命令

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm test:runtime-monitor
pnpm check:public-docs
node packages/cli/dist/index.js mcp
```

## 发布前检查

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm check:versions
pnpm check:public-docs
pnpm check:release-clean
pnpm release:local
```

## 发布 npm 包

```bash
git switch dev
git switch -c release/vX.Y.Z
pnpm run publish:npm:dry-run
pnpm run publish:npm
```

发布只应在 `release/vX.Y.Z` 或 `main` 分支执行。完整分支和发布规则见 [../release-flow.md](../release-flow.md)。

## Next smoke

Next 项目识别和接入提示应通过两个示例项目做真实 MCP 流程验收：

1. 在 `examples/next-app-router` 中启动 MCP，并调用 `start_ui_inspect`。
2. 确认返回的 `integration.projectType` 为 `next`，`integration.router` 为 `app`。
3. 确认 `integration.missing` 为空；如果示例被故意改成未接入状态，应准确提示缺少 `@ui-inspect/next`、`UiInspectScript` 或 `diana-route`。
4. 确认 App Router 的接入说明保持为 `UiInspectScript` 加 `GET`。
5. 在 `examples/next-pages-router` 中重复验收，确认 `integration.router` 为 `pages`。
6. 确认 Pages Router 的接入说明保持为 `UiInspectScript` 加 `dianaHandler`。
7. 如果返回包含 `snippets`，确认片段与公开 API 一致。

## 包拓扑

```text
protocol -> shared / server / browser-adapter -> browser-ui -> integrations -> cli
```

其中 integrations 包括 Vite、Next.js、Webpack、Rspack 和 Rsbuild。
