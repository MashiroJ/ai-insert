<div align="center">

# ui-inspect

### 把浏览器里的真实前端上下文交给 AI coding agent

[![npm cli](https://img.shields.io/npm/v/@ui-inspect/cli?label=%40ui-inspect%2Fcli&color=2f6fed)](https://www.npmjs.com/package/@ui-inspect/cli)
[![MCP](https://img.shields.io/badge/MCP-ready-22c55e)](https://modelcontextprotocol.io/)
[![Vite](https://img.shields.io/badge/Vite-supported-646cff)](docs/zh-CN/getting-started.md)
[![Next.js](https://img.shields.io/badge/Next.js-supported-111111)](docs/zh-CN/getting-started.md)

简体中文 · [English](README.en.md)

[快速开始](docs/zh-CN/getting-started.md) · [Agent 使用指南](docs/zh-CN/agent-guide.md) · [MCP 与 CLI 参考](docs/zh-CN/reference.md)

</div>

---

## ui-inspect 是什么

ui-inspect 是一个通用的 MCP 前端检查桥。

它让你在浏览器里点选真实页面元素，然后把 AI 很难从截图或文字里猜出来的上下文交给 coding agent：DOM、selector、组件和源码线索、计算样式、CSS diff、console 诊断、多元素备注、任务会话状态。

它不绑定某个 IDE 或 AI 产品。Cursor、Claude Code、Codex CLI、OpenCode，以及其他支持 MCP 的 agent，都可以通过同一套工具读取这些上下文。

## 它解决什么问题

前端开发里经常出现这种沟通成本：

> “帮我改页面中间那个卡片，但不是整个模块，是标题下面偏右那块。”

人能看懂，AI 通常只能猜。ui-inspect 的目标是把“我正在看的这一块”变成 agent 可以直接处理的结构化上下文，让它少猜一点，多改对一点。

## 核心能力

| 能力 | 说明 |
| --- | --- |
| 元素选择 | 采集 DOM、selector、尺寸、文本、计算样式、组件和源码线索 |
| 精准源码定位 | 从浏览器选中元素后，给 agent 文件路径、模板行号、样式规则行号和附近源码上下文 |
| 批量标注 | 连续选择多个元素，为每个目标补充独立备注后一起发送 |
| 问题排查 | 发送用户确认过的 console error、warning、异常和运行时摘要 |
| CSS Debug | 在浏览器中预览样式变化，发送 changed styles、拖拽意图、布局建议、覆盖风险和样式来源 |
| MCP loop | agent 处理完当前浏览器任务后，可继续等待下一条 Send |
| Diana 面板 | 浏览器悬浮入口，支持模式切换、历史记录、任务状态和消息回写 |

## 快速开始

### 1. 配置 MCP server

在你的 MCP client 中加入：

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

TOML 风格配置：

```toml
[mcp_servers.ui-inspect]
type = "stdio"
command = "npx"
args = ["-y", "@ui-inspect/cli@latest", "mcp"]
```

### 2. 在前端项目中接入插件

Vite：

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

Next.js、Webpack、Rspack、Rsbuild 的接入方式见 [快速开始](docs/zh-CN/getting-started.md)。

### 3. 启动你的前端项目

按项目原本的方式启动 dev server：

```bash
npm run dev
```

然后在 agent 对话里说：

```text
启用 ui-inspect
```

也可以说：

```text
使用 ui-inspect
调用 ui-inspect
启动 ui-inspect
打开 UI 检查
start ui-inspect
enable ui-inspect
```

agent 应该调用 `start_ui_inspect`，再调用 `wait_for_frontend_request` 等待浏览器任务。页面里出现 Diana 后，你就可以在浏览器中选择元素并 Send。

## 推荐的 Agent 工作流

一次启用后，推荐让 agent 进入连续处理模式：

```text
启用 ui-inspect，并持续处理我从浏览器发送的任务。
```

标准流程：

```text
start_ui_inspect
  -> wait_for_frontend_request
  -> 读取上下文并修改源码
  -> complete_frontend_request
  -> 自动等待下一条浏览器任务
```

`complete_frontend_request` 会完成当前任务、把结果回写到浏览器面板，并继续等待下一条 Send。这样你不需要每次都回到聊天里说“我已经发了”。

MCP 协议本身不会让 server 主动唤醒 agent；ui-inspect 采用的是长等待工具加完成出口的 MCP loop。是否持续处理，最终仍取决于 agent 是否遵守工具说明。

Agent 收到任务后，推荐先读这些字段：

- `contextSummary`：快速判断用户选中了什么。
- `targetsSummary`：批量任务和 CSS Debug 的首要入口，包含每个 target 的改动摘要。
- `sourceHintSummary`：源码候选、置信度和原因。
- `cssDebugSummary`：CSS diff、样式来源、布局建议和覆盖风险摘要。
- `source`：compact 模式下只返回文件和行号范围，需要源码内容时再调用 `get_frontend_source`。

## CSS Debug

CSS Debug 适合“不确定该调哪个 CSS 属性，但想先在浏览器里试一试”的场景。

它支持：

- 拖拽移动元素，记录 `transform` 预览意图。
- 8 方向 resize：`nw / n / ne / w / e / sw / s / se`。
- 从左侧或上方 resize 时自动补偿位移，尽量保持对边或对角固定。
- 键盘微调：`Shift + Arrow` 调 margin，`Alt + Arrow` 调 padding，`Shift + Alt + Arrow` 调字体大小或字间距。
- 盒模型可视化：在 overlay 中查看 margin 和 padding 区域。
- 发送 CSS diff：包含主动改动、拖拽记录、布局上下文和连带计算变化。
- 页面级多目标编辑：一次 CSS Debug 会话里可以添加多个元素，每个目标保留自己的 diff、备注和源码映射。
- 源码智能提示：为 Vue SFC 推断 template 行号，定位匹配的 `<style>` 规则，并在 compact 响应里暴露 `file:line + selector`。
- 布局建议：拖拽产生的 `transform` 会被视为预览表达，agent 会优先看到 margin、align-self、justify-self、left/top 等更适合落源码的候选。
- 覆盖风险提示：同一文件中可能覆盖同一 CSS 属性的规则会以 `specificityWarnings` 提醒 agent 复查。

浏览器端只预览 inline style，不会直接写源码。真正的代码修改由 MCP agent 根据 diff 和源码上下文完成。

## 支持的接入方式

| 场景 | 包 |
| --- | --- |
| MCP server / CLI | `@ui-inspect/cli` |
| Vite | `@ui-inspect/vite-plugin` |
| Next.js | `@ui-inspect/next` |
| Webpack | `@ui-inspect/webpack-plugin` |
| Rspack | `@ui-inspect/rspack-plugin` |
| Rsbuild | `@ui-inspect/rsbuild-plugin` |
| 协议类型 | `@ui-inspect/protocol` |

## 工作原理

```text
Browser page
  -> Diana browser UI
  -> local ui-inspect daemon
  -> MCP tools
  -> AI coding agent
  -> source code changes in your workspace
```

浏览器负责采集上下文和展示状态，daemon 负责本地会话与源码读取，MCP tools 负责把这些信息交给 agent。ui-inspect 不启动 Claude、Codex、Cursor 或 OpenCode 进程，也不做 IDE 专属 runner。

## 安全边界

- 不会从浏览器直接修改源码。
- 不会自动发送 cookies、localStorage、网络请求正文或截图。
- console 诊断需要用户确认后才会进入任务上下文。
- 会话历史保存在当前项目的 `<project>/.ui-inspect/sessions.json`。
- daemon 默认只服务本地开发场景，插件和 MCP server 都应该在可信工作区中使用。

## 文档

| 文档 | 内容 |
| --- | --- |
| [快速开始](docs/zh-CN/getting-started.md) | MCP 配置和各类前端项目接入 |
| [Agent 使用指南](docs/zh-CN/agent-guide.md) | agent 如何正确调用 MCP tools |
| [MCP 与 CLI 参考](docs/zh-CN/reference.md) | tools、命令、本地数据和协议说明 |
| [维护者指南](docs/zh-CN/maintainer.md) | 本地开发、检查和发布前验收 |
| [发布流程](docs/release-flow.md) | dev、release、main 分支发布规则 |

## Roadmap

- 更好的 React、Next.js、Svelte、Angular 源码定位提示。
- 更完整的 CSS cascade 分析和跨文件样式来源提示。
- 更稳定的复杂页面批量选择体验。
- 更清晰的 MCP client 配置生成和排错提示。

## 参与贡献

欢迎提交 issue、想法和 PR。

ui-inspect 的目标很朴素：让你在浏览器里看到的前端事实，成为 AI coding agent 能真正使用的上下文。

## 仓库

[github.com/MashiroJ/ui-inspect](https://github.com/MashiroJ/ui-inspect)
