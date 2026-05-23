# ui-inspect

> Let AI coding agents understand the frontend page you are looking at.
>
> 让 AI coding agent 看懂你正在看的前端页面。

ui-inspect is a browser inspection and MCP context bridge for frontend development. It turns a selected page element, CSS tweak, runtime issue, or batch UI request into structured context an AI agent can act on: DOM, styles, component hints, source hints, notes, diagnostics, and session state.

ui-inspect 是一个面向前端开发的浏览器检查与 MCP 上下文桥接工具。它把你在浏览器里点选的元素、CSS 调试、运行时报错或批量 UI 需求，转成 AI 能直接处理的结构化上下文：DOM、样式、组件信息、源码线索、用户备注、诊断日志和会话状态。

It does not depend on a specific AI product. Any MCP-capable coding agent can use it.

它不绑定某个 AI 产品。只要你的 coding agent 支持 MCP，就可以接入。

## Documentation / 文档

| English | 简体中文 |
| --- | --- |
| [Getting Started](docs/en/getting-started.md) | [快速开始](docs/zh-CN/getting-started.md) |
| [Agent Guide](docs/en/agent-guide.md) | [Agent 使用指南](docs/zh-CN/agent-guide.md) |
| [MCP and CLI Reference](docs/en/reference.md) | [MCP 与 CLI 参考](docs/zh-CN/reference.md) |
| [Maintainer Guide](docs/en/maintainer.md) | [维护者指南](docs/zh-CN/maintainer.md) |
| [Release Flow](docs/release-flow.md) | [发布流程](docs/release-flow.md) |

## What It Does / 它能做什么

- Select a real DOM element in the browser and send source-aware context to AI.
- Multi-select several UI targets, add notes per target, and send them as one task.
- Debug CSS visually: adjust properties, drag position or size, then send the style diff.
- Capture confirmed console diagnostics for runtime debugging.
- Use Diana, a movable browser-side assistant, to open tools, send tasks, and view status.

- 在浏览器中点选真实 DOM 元素，把带源码线索的上下文发给 AI。
- 多选多个 UI 目标，给每个目标写备注，再作为一个任务发送。
- 可视化调试 CSS：调整属性、拖拽位置或尺寸，再发送样式 diff。
- 选择并确认 console 诊断信息，用于运行时问题排查。
- 通过可拖动的 Diana 悬浮入口打开工具、发送任务、查看状态。

## Supported Integrations / 支持的接入方式

| Frontend stack | Package | Status |
| --- | --- | --- |
| Vite | `@ui-inspect/vite-plugin` | Recommended, most verified |
| Next.js | `@ui-inspect/next` | Recommended, App Router / Pages Router |
| Webpack | `@ui-inspect/webpack-plugin` | Available |
| Rspack | `@ui-inspect/rspack-plugin` | Available |
| Rsbuild | `@ui-inspect/rsbuild-plugin` | Available |

Vite is the smoothest path today. Next.js is supported through `UiInspectScript` plus a Diana API route, so it works with both Webpack dev and Turbopack dev.

Vite 是当前最顺滑的入口。Next.js 通过 `UiInspectScript` 加 Diana API route 接入，因此可以同时覆盖 Webpack dev 和 Turbopack dev。

## Quick Start / 快速开始

Add ui-inspect to your MCP client:

在 MCP client 中加入 ui-inspect：

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

Then install the integration package for your frontend project. For example, Vite:

然后在你的前端项目中安装对应接入包。以 Vite 为例：

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

Start your app with its normal dev command, open the page, then tell your AI agent:

按项目原本的 dev 命令启动应用并打开页面，然后对 AI agent 说：

```text
启用 ui-inspect
```

For Next.js, Webpack, Rspack, and Rsbuild setup, see [Getting Started](docs/en/getting-started.md) or [快速开始](docs/zh-CN/getting-started.md).

Next.js、Webpack、Rspack、Rsbuild 的接入方式见 [Getting Started](docs/en/getting-started.md) 或 [快速开始](docs/zh-CN/getting-started.md)。

## Packages / 包

User-facing packages:

用户通常直接安装：

```text
@ui-inspect/cli
@ui-inspect/vite-plugin
@ui-inspect/next
@ui-inspect/webpack-plugin
@ui-inspect/rspack-plugin
@ui-inspect/rsbuild-plugin
```

Runtime and internal packages:

运行时与内部包：

```text
@ui-inspect/protocol
@ui-inspect/shared
@ui-inspect/server
@ui-inspect/browser-adapter
@ui-inspect/browser-ui
```

## Safety / 安全边界

ui-inspect does not directly modify source code from the browser. It stores browser-side context in a local daemon, then an MCP-capable AI agent reads that context and edits code in your workspace.

ui-inspect 不会从浏览器直接修改源码。浏览器只把上下文保存到本地 daemon；真正的代码修改由支持 MCP 的 AI agent 在你的工作区完成。

Diagnostics are shown for confirmation before sending. ui-inspect does not automatically send cookies, localStorage, request bodies, or screenshots.

诊断日志会先展示给用户确认。ui-inspect 不会自动发送 cookies、localStorage、网络请求正文或截图。

## Local Data / 本地数据

Session history is stored in the target project:

会话历史保存在目标项目：

```text
<project>/.ui-inspect/sessions.json
```

You usually should not commit `.ui-inspect/`.

通常不需要提交 `.ui-inspect/`。

```gitignore
.ui-inspect/
```

## Repository / 仓库

[github.com/MashiroJ/ui-inspect](https://github.com/MashiroJ/ui-inspect)
