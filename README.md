<div align="center">

# ui-inspect

### 让 AI coding agent 看懂你正在看的前端页面

[![npm cli](https://img.shields.io/npm/v/@ui-inspect/cli?label=%40ui-inspect%2Fcli&color=2f6fed)](https://www.npmjs.com/package/@ui-inspect/cli)
[![MCP](https://img.shields.io/badge/MCP-ready-22c55e)](https://modelcontextprotocol.io/)
[![Vite](https://img.shields.io/badge/Vite-supported-646cff)](docs/zh-CN/getting-started.md)
[![Next.js](https://img.shields.io/badge/Next.js-supported-111111)](docs/zh-CN/getting-started.md)

简体中文 · [English](README.en.md)

[快速开始](docs/zh-CN/getting-started.md) · [Agent 使用指南](docs/zh-CN/agent-guide.md) · [MCP 与 CLI 参考](docs/zh-CN/reference.md)

</div>

---

## 项目介绍

ui-inspect 是一个面向前端开发的浏览器检查与 MCP 上下文桥接工具。

当你在浏览器里点选真实元素时，它能把截图无法表达的上下文交给 AI：DOM 结构、计算样式、组件信息、源码线索、console 诊断、CSS 调试 diff、用户备注和任务会话。

它不绑定某个 AI 产品。只要你的 coding agent 支持 MCP，就可以接入。

## 为什么需要它

前端开发里最难和 AI 描述的，往往不是需求本身，而是：

> “我要改页面上的这一块，但我很难把这一块说清楚。”

ui-inspect 让浏览器可以把真实页面上下文交给你的 AI agent，少一点猜测，多一点可执行的信息。

## 核心功能

| 功能 | 发送给 AI 的上下文 |
| --- | --- |
| 元素选择 | DOM、selector、尺寸、计算样式、源码线索 |
| 源码线索 | 组件名、文件候选、附近源码上下文 |
| 批量调整 | 多个目标元素，以及每个目标自己的备注 |
| CSS 调试 | 样式 diff、拖拽意图、布局上下文、连带计算变化 |
| 问题排查 | 用户确认过的 console 错误、警告和异常 |
| Diana 助手 | 浏览器悬浮入口、工具面板、历史记录和任务状态 |

## 快速开始

### 1. 添加 MCP server

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

### 2. 添加前端项目接入

以 Vite 为例：

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

Next.js、Webpack、Rspack、Rsbuild 接入见 [快速开始](docs/zh-CN/getting-started.md)。

### 3. 启动项目并告诉 AI

按项目原本方式启动：

```bash
npm run dev
```

然后打开页面，对 AI agent 说：

```text
启用 ui-inspect
```

agent 应调用 `start_ui_inspect`，再调用 `wait_for_frontend_request`。随后 Diana 会出现在浏览器里，你可以选择元素、发送 CSS 调试任务或问题排查任务。

## 文档导航

| 文档 | 说明 |
| --- | --- |
| [快速开始](docs/zh-CN/getting-started.md) | MCP 配置和各类前端项目接入 |
| [Agent 使用指南](docs/zh-CN/agent-guide.md) | AI agent 如何使用 ui-inspect 的标准流程 |
| [MCP 与 CLI 参考](docs/zh-CN/reference.md) | MCP tools、CLI 命令、本地数据 |
| [维护者指南](docs/zh-CN/maintainer.md) | 开发、检查、发布前验收 |
| [发布流程](docs/release-flow.md) | dev / release / main 分支发布规则 |

## 工作原理

```text
Browser page
  -> Diana browser UI
  -> local ui-inspect daemon
  -> MCP server
  -> AI coding agent
  -> source code changes in your workspace
```

浏览器端只负责采集上下文和预览样式变化，不会直接修改源码。真正的代码修改由正在等待任务的 AI agent 完成。

## 安全边界

- ui-inspect 不会从浏览器直接修改源码。
- 运行时诊断会先展示给用户确认。
- 不会自动发送 cookies、localStorage、网络请求正文或截图。
- 会话历史保存在本地 `<project>/.ui-inspect/sessions.json`。

## Roadmap

- 更顺滑的 Next.js 接入引导和项目识别。
- 更精确的 CSS 调试意图建模。
- 更丰富的项目检测和接入提示。
- 更适合复杂页面的 Diana 面板交互。

## 参与贡献

欢迎提交 issue、想法和 PR。

这个项目的目标很简单：让前端页面和 AI coding agent 之间的沟通少一点猜测，多一点真实上下文。

## 仓库

[github.com/MashiroJ/ui-inspect](https://github.com/MashiroJ/ui-inspect)
