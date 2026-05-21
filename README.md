# ai-inspect

ai-inspect 是一个面向前端项目的通用 MCP 上下文服务。

它让用户在本地浏览器里框选页面元素，采集 DOM、样式、Vue 组件和源码线索，再通过 MCP tools 交给任意支持 MCP 的 AI coding agent。它不绑定 Claude、Codex、Cursor 或任何特定 agent，也不会在浏览器里直接改代码。

当前重点支持：Vite + Vue 3。

## 适合谁用

- 你正在开发一个 Vite / Vue 前端项目。
- 你使用的 AI coding 工具支持 MCP。
- 你希望在浏览器里选中一个真实页面元素，然后让 AI 直接拿到对应的 DOM、样式、组件和源码上下文。

## 安装

### 1. 配置 MCP server

推荐在 MCP client 里直接使用 npm 最新版：

```json
{
  "mcpServers": {
    "ai-inspect": {
      "command": "npx",
      "args": ["-y", "@mashiro39/ai-inspect-cli@latest", "mcp"]
    }
  }
}
```

如果你的 MCP client 使用 TOML：

```toml
[mcp_servers.ai-inspect]
type = "stdio"
command = "npx"
args = ["-y", "@mashiro39/ai-inspect-cli@latest", "mcp"]
```

也可以全局安装后再配置：

```bash
npm install -g @mashiro39/ai-inspect-cli@latest
```

```json
{
  "mcpServers": {
    "ai-inspect": {
      "command": "ai-inspect",
      "args": ["mcp"]
    }
  }
}
```

### 2. 给前端项目安装 Vite 插件

在你的 Vite / Vue 项目目录执行：

```bash
npm install -D @mashiro39/ai-inspect-vite-plugin@latest
```

pnpm：

```bash
pnpm add -D @mashiro39/ai-inspect-vite-plugin@latest
```

yarn：

```bash
yarn add -D @mashiro39/ai-inspect-vite-plugin@latest
```

### 3. 修改 Vite 配置

在 `vite.config.ts` 或 `vite.config.js` 中加入 `aiInspect()`：

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';

export default defineConfig({
  plugins: [vue(), aiInspect()],
});
```

如果项目已有插件，只需要把 `aiInspect()` 加进 `plugins` 数组：

```ts
export default defineConfig({
  plugins: [vue(), aiInspect(), otherPlugin()],
});
```

### 4. 启动你的前端项目

```bash
npm run dev
```

或：

```bash
pnpm dev
yarn dev
```

## 使用方式

在你的 AI coding agent 对话里输入：

```text
启用 ai-insert
```

agent 应该调用 MCP tool `start_ai_inspect`，然后调用 `wait_for_frontend_request` 等待你在浏览器里选择元素并发送需求。

页面右下角会出现 `AI 调试` 按钮：

1. 点击 `AI 调试`。
2. 点击 `选择`。
3. 在页面上点选要修改的元素。
4. 输入需求，例如“把这个按钮改成红色，并加一点 hover 效果”。
5. 点击 `发送`。
6. AI 会通过 `wait_for_frontend_request` 收到 selection、session 和源码上下文，然后继续改代码。

如果 10 分钟内没有点击发送，本次等待会超时，并关闭本次 ai-inspect daemon / MCP 进程。

## 给 AI agent 的接入说明

如果用户把这个仓库地址发给你，并要求接入 ai-inspect，请按下面流程执行：

1. 检查用户项目是否是 Vite / Vue 项目。
2. 安装 `@mashiro39/ai-inspect-vite-plugin@latest`。
3. 在 Vite 配置中加入 `aiInspect()`。
4. 指导用户把 `ai-inspect` 加入 MCP client 配置。
5. 当用户说 `启用 ai-insert` 时，直接调用 `start_ai_inspect`。
6. `start_ai_inspect` 返回页面 URL 后，提示用户在浏览器里打开或继续使用该页面。
7. 立即调用 `wait_for_frontend_request`，等待用户在浏览器面板中选择元素并点击发送。
8. 收到结果后，根据用户需求修改代码。
9. 修改完成后，可以调用 `reply_to_user` 把简短结果回写到浏览器面板。

不要查找项目里是否有名为 `ai-insert` 的业务功能；`启用 ai-insert` 是固定触发语。

## MCP Tools

### `start_ai_inspect`

启动或检查 ai-inspect 工作流。

主要行为：

- 启动或复用本地 daemon。
- 检查当前项目是否接入 Vite 插件。
- 启动或复用 dev server。
- 返回状态和本地 URL。
- 不打开浏览器。
- 不启动任何固定 agent。

### `wait_for_frontend_request`

等待用户在浏览器面板里选择元素并点击 `发送`。

默认最多等待 10 分钟。成功后返回：

- 最新用户需求
- 当前 session
- 当前 selection
- 相关源码上下文

超时后会关闭本次 ai-inspect daemon / MCP 进程。

### `get_frontend_selection`

读取当前浏览器选中的前端元素。

返回内容包括：

- 页面 URL
- CSS selector
- DOM 快照
- 元素尺寸
- 计算样式
- Vue 组件信息
- 源码文件线索
- 用户输入的需求

### `get_frontend_source`

根据 selection 的源码线索读取附近代码。

常用参数：

```json
{
  "context": 80
}
```

### `get_frontend_sessions`

读取最近的调试会话和消息历史。

### `reply_to_user`

把 AI 的简短回复写回浏览器面板。

示例：

```json
{
  "content": "已修改按钮样式，并保留了现有交互。"
}
```

## CLI 命令

平时用户只需要通过 MCP client 启动：

```bash
npx -y @mashiro39/ai-inspect-cli@latest mcp
```

全局安装后也可以：

```bash
ai-inspect mcp
```

其他命令主要用于调试：

```bash
ai-inspect daemon
ai-inspect status
ai-inspect selection --json
ai-inspect source --context 80
ai-inspect sessions
ai-inspect reply --content "已完成"
ai-inspect clear
```

## 工作原理

ai-inspect 有四层：

- Vite 插件：在 dev server 中注入浏览器调试面板。
- 浏览器面板：负责选择元素、输入需求、查看历史。
- 本地 daemon：默认运行在 `http://127.0.0.1:17321`，保存 selection 和 session。
- MCP server：把浏览器采集到的上下文提供给 AI agent。

浏览器不会直接改代码。点击 `发送` 会把当前选择和用户需求记录到 daemon session。如果 AI agent 正在调用 `wait_for_frontend_request`，这个 tool 会立刻返回上下文，agent 就可以继续修改代码。

## 数据保存位置

会话历史保存在目标项目：

```text
<project>/.ai-insert/sessions.json
```

`.ai-insert/` 是本地调试状态目录，通常不需要提交到 git。

建议加入 `.gitignore`：

```gitignore
.ai-insert/
```

## 常见问题

### 页面没有出现 `AI 调试` 按钮

检查：

- 项目是否是 Vite dev server。
- `vite.config.ts/js` 是否加入了 `aiInspect()`。
- 是否重启了 dev server。

### agent 找不到 MCP tool

检查：

- MCP 配置是否使用了 `npx -y @mashiro39/ai-inspect-cli@latest mcp`。
- 如果使用全局安装，终端里 `ai-inspect mcp` 是否能启动。
- MCP client 是否已经重启或重新加载配置。

### `start_ai_inspect` 没有打开浏览器

这是预期行为。它只返回本地 URL，不主动打开或刷新浏览器。

### 点击 `发送` 后 AI 没有继续改代码

请确认你已经先在 AI 对话里说了：

```text
启用 ai-insert
```

AI agent 需要先调用 `start_ai_inspect` 和 `wait_for_frontend_request`。如果没有处于等待状态，浏览器发送只会保存 session，不会主动唤醒任意 MCP client。

### 如何更新到最新版

如果 MCP 配置使用 `@latest`：

```json
{
  "command": "npx",
  "args": ["-y", "@mashiro39/ai-inspect-cli@latest", "mcp"]
}
```

通常会使用 npm 上的最新版本。

如果你全局安装过：

```bash
npm install -g @mashiro39/ai-inspect-cli@latest
```

前端项目里的 Vite 插件也可以更新：

```bash
npm install -D @mashiro39/ai-inspect-vite-plugin@latest
```

## 本地开发

这些命令只给 ai-inspect 项目维护者使用，普通用户不需要执行：

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js mcp
```

发布 npm 包：

```bash
pnpm run publish:npm:dry-run
pnpm run publish:npm
```
