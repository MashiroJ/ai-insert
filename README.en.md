<div align="center">

# ui-inspect

### Let AI coding agents understand the frontend page you are looking at

[![npm cli](https://img.shields.io/npm/v/@ui-inspect/cli?label=%40ui-inspect%2Fcli&color=2f6fed)](https://www.npmjs.com/package/@ui-inspect/cli)
[![MCP](https://img.shields.io/badge/MCP-ready-22c55e)](https://modelcontextprotocol.io/)
[![Vite](https://img.shields.io/badge/Vite-supported-646cff)](docs/en/getting-started.md)
[![Next.js](https://img.shields.io/badge/Next.js-supported-111111)](docs/en/getting-started.md)

[简体中文](README.md) · English

[Getting Started](docs/en/getting-started.md) · [Agent Guide](docs/en/agent-guide.md) · [MCP and CLI Reference](docs/en/reference.md)

</div>

---

## Introduction

ui-inspect is a browser inspection and MCP context bridge for frontend development.

When you point at a real element in the browser, ui-inspect can send your AI agent the things screenshots cannot carry: DOM structure, computed styles, component hints, source candidates, template lines, style rule lines, console diagnostics, user notes, and session state.

It does not depend on a specific AI product. Any MCP-capable coding agent can use it.

## Why It Exists

Frontend work is often blocked by a deceptively simple problem:

> “I want the AI to change *this thing on the page*, but describing *this thing* is painful.”

ui-inspect gives the browser a way to speak to your agent with real, actionable context instead of guesswork.

## Core Features

| Feature | Context sent to AI |
| --- | --- |
| Element selection | DOM, selector, size, computed styles, source hints |
| Precise source hints | Component names, file candidates, template lines, style rule lines, nearby source context |
| Batch task | Multiple targets with notes per target |
| Runtime debug | User-confirmed console errors, warnings, and exceptions |
| MCP loop | Complete one browser task and keep waiting for the next Send |
| Diana panel | Floating browser UI, tool panel, history, task status, and agent replies |

## Quick Start

### 1. Add the MCP server

```json
{
  "mcpServers": {
    "ui-inspect": {
      "command": "npx",
      "args": ["-y", "@ui-inspect/cli@latest", "mcp"]
    }
  }
}
```

### 2. Add a frontend integration

For Vite:

```bash
npm install -D @ui-inspect/vite-plugin@latest
```

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { uiInspect } from '@ui-inspect/vite-plugin';

export default defineConfig({
  plugins: [vue(), uiInspect()],
});
```

For Next.js, Webpack, Rspack, and Rsbuild, see [Getting Started](docs/en/getting-started.md).

### 3. Start your app and ask your agent

Run your normal dev command:

```bash
npm run dev
```

Then open the page and tell your AI agent:

```text
start ui-inspect
```

You can also say `enable ui-inspect`, `use ui-inspect`, `launch ui-inspect`, `turn on ui-inspect`, or `启用 ui-inspect`. The agent should call `start_ui_inspect`, then `wait_for_frontend_request`. Diana will appear in the browser, and you can select elements or send AI tasks.

## Updating ui-inspect

If you already have `ui-inspect` installed, run this from your frontend project root:

```bash
ui-inspect update
```

It will update the frontend integration package it can detect, such as `@ui-inspect/vite-plugin`, `@ui-inspect/next`, `@ui-inspect/webpack-plugin`, `@ui-inspect/rspack-plugin`, or `@ui-inspect/rsbuild-plugin`.

Useful options:

```bash
ui-inspect update --dry-run
ui-inspect update --project /path/to/frontend
ui-inspect update --self
```

`--self` tries to update a globally installed `@ui-inspect/cli`. If your MCP config uses `npx -y @ui-inspect/cli@latest mcp`, you usually do not need a self update; restart the agent/MCP session instead.

After updating, users still need to:

- Restart the frontend dev server so the browser-injected ui-inspect client is refreshed.
- Restart any running agent/MCP session so it does not keep an old process alive.

## Recommended Agent Workflow

For continuous browser-driven work, ask your agent:

```text
Start ui-inspect and keep processing the tasks I send from the browser.
```

The recommended MCP flow is:

```text
start_ui_inspect
  -> wait_for_frontend_request
  -> inspect context and edit source code
  -> complete_frontend_request
  -> wait for the next browser task
```

`complete_frontend_request` marks the current task as done or failed, writes the agent reply back into the browser panel, and waits for the next Send. MCP servers cannot wake agents by themselves, so this loop depends on the agent following the tool instructions.

When a task arrives, agents should read:

- `contextSummary`: what the user selected.
- `targetsSummary`: the first place to inspect batch task targets.
- `sourceHintSummary`: source candidates, confidence, and reasons.
- `runtimeSummary`: user-confirmed console diagnostics for troubleshooting tasks.
- `source`: compact metadata for the selected source range. Use `get_frontend_source` when full source content is needed.

## Documentation

| Document | Description |
| --- | --- |
| [Getting Started](docs/en/getting-started.md) | MCP setup and frontend integration guides |
| [Agent Guide](docs/en/agent-guide.md) | Standard workflow for AI agents using ui-inspect |
| [MCP and CLI Reference](docs/en/reference.md) | MCP tools, CLI commands, and local data |
| [Maintainer Guide](docs/en/maintainer.md) | Development, checks, and pre-release validation |
| [Release Flow](docs/release-flow.md) | dev / release / main branch release rules |

## How It Works

```text
Browser page
  -> Diana browser UI
  -> local ui-inspect daemon
  -> MCP server
  -> AI coding agent
  -> source code changes in your workspace
```

The browser side collects context and previews style changes. It does not directly modify source code. Source changes are made by the AI agent waiting for the task.

ui-inspect does not launch Claude, Codex, Cursor, OpenCode, or any other agent process. It stays as a general MCP bridge so different MCP-capable agents can use the same browser context.

## Safety

- ui-inspect does not directly modify source code from the browser.
- Runtime diagnostics are shown for confirmation before sending.
- It does not automatically send cookies, localStorage, request bodies, or screenshots.
- Session history is stored locally in `<project>/.ui-inspect/sessions.json`.

## Roadmap

- More precise source hints for React, Next.js, Svelte, and Angular.
- Deeper CSS cascade analysis across files.
- More stable complex-page multi-target selection.
- Clearer MCP client setup snippets and troubleshooting output.

## Contributing

Issues, ideas, and pull requests are welcome.

The goal is simple: help frontend pages and AI coding agents communicate with less guessing and more real context.

## Repository

[github.com/MashiroJ/ui-inspect](https://github.com/MashiroJ/ui-inspect)
