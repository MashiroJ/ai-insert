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

When you point at a real element in the browser, ui-inspect can send your AI agent the things screenshots cannot carry: DOM structure, computed styles, component hints, source candidates, console diagnostics, CSS debug diffs, user notes, and session state.

It does not depend on a specific AI product. Any MCP-capable coding agent can use it.

## Why It Exists

Frontend work is often blocked by a deceptively simple problem:

> “I want the AI to change *this thing on the page*, but describing *this thing* is painful.”

ui-inspect gives the browser a way to speak to your agent with real, actionable context instead of guesswork.

## Core Features

| Feature | Context sent to AI |
| --- | --- |
| Element selection | DOM, selector, size, computed styles, source hints |
| Source hints | Component names, file candidates, nearby source context |
| Batch edit | Multiple targets with notes per target |
| CSS debug | Style diff, drag intent, layout context, computed side effects |
| Runtime debug | User-confirmed console errors, warnings, and exceptions |
| Diana assistant | Floating browser UI, tool panel, history, and task status |

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

You can also say `enable ui-inspect`, `use ui-inspect`, `launch ui-inspect`, `turn on ui-inspect`, or `启用 ui-inspect`. The agent should call `start_ui_inspect`, then `wait_for_frontend_request`. Diana will appear in the browser, and you can select elements or send CSS/debug tasks.

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

## Safety

- ui-inspect does not directly modify source code from the browser.
- Runtime diagnostics are shown for confirmation before sending.
- It does not automatically send cookies, localStorage, request bodies, or screenshots.
- Session history is stored locally in `<project>/.ui-inspect/sessions.json`.

## Roadmap

- Better Next.js onboarding and project setup guidance.
- More precise CSS debug intent modeling.
- Richer project detection and integration hints.
- Cleaner Diana panel interactions for complex pages.

## Contributing

Issues, ideas, and pull requests are welcome.

The goal is simple: help frontend pages and AI coding agents communicate with less guessing and more real context.

## Repository

[github.com/MashiroJ/ui-inspect](https://github.com/MashiroJ/ui-inspect)
