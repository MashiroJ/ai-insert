# Agent Guide

This guide is for AI coding agents. Follow it when a user asks you to integrate or use ui-inspect.

## Trigger Phrase

```text
启用 ui-inspect
```

When the user says this, do not search the business feature first and do not guess the page structure. Start the ui-inspect workflow.

## Integrating a Project

1. Detect the project type. Check `package.json`, `vite.config.*`, `next.config.*`, `webpack.config.*`, `rspack.config.*`, and `rsbuild.config.*`.
2. For Vite, install `@ui-inspect/vite-plugin@latest` and add `uiInspect()`.
3. For Next.js, install `@ui-inspect/next@latest`, add `UiInspectScript`, and add the Diana API route for App Router or Pages Router.
4. For Webpack, Rspack, or Rsbuild, install the matching package and add `uiInspect()` or `pluginUiInspect()`.
5. Tell the user how to configure MCP with `npx -y @ui-inspect/cli@latest mcp`.

## Runtime Workflow

1. When the user says `启用 ui-inspect`, call `start_ui_inspect`.
2. Read the returned project detection result, integration status, and next steps.
3. Ask the user to start their frontend dev server and open the target page.
4. Call `wait_for_frontend_request`.
5. When a browser task arrives, read `selection`, `targets`, `targetSources`, `session`, and the user notes.
6. Before editing code, call `update_ui_task_status` with `working`.
7. When done, call `update_ui_task_status` with `done`, then use `reply_to_user` to write a short result back to the browser panel.

## Batch Tasks

For batch tasks, process every item in `targets` and `targetSources`. Do not only edit the first target.

Each target can have its own note, selector, DOM summary, and source hint. Preserve those differences instead of applying one mechanical edit everywhere.

## Debug Tasks

For runtime debugging tasks, read:

- `diagnostics`
- `runtimeSummary`
- `sourceHints`

Diagnostics are sent only after user confirmation, but they may still contain sensitive information. Do not paste unnecessary log content into the final response.

## CSS Debug Tasks

For CSS debug tasks, read:

- `changedStyles`
- `primaryInteraction`
- `interactions`
- `computedEffects`
- `layoutContext`
- `originalStyles`
- `previewStyles`
- user notes
- `sourceHints`

`changedStyles` represents properties the user actively changed. `primaryInteraction` and `interactions` show whether the user used the panel, moved the element, or resized it.

Use `computedEffects` and `layoutContext` to understand side effects. Prefer changing source CSS, component styles, or classes. Do not blindly copy browser preview inline styles.

A drag-generated `transform` is often just an intent preview. Inspect the parent layout before deciding whether the final code should use `margin`, `gap`, `align-*`, `justify-*`, grid/flex configuration, or keep `transform`.
