# ai-inspect

ai-inspect 是一个给前端项目使用的通用 MCP 上下文服务。

它让用户在本地浏览器里框选页面元素，采集 DOM、样式、Vue 组件和源码线索，再通过 MCP tools 交给任意支持 MCP 的 AI coding agent。它不绑定某一家 agent，也不会在浏览器里直接改代码。

当前重点支持：Vite + Vue 3。

## 给 AI 的说明

如果用户把这个仓库地址发给你，并要求接入 ai-inspect，请按下面流程执行：

1. 在用户机器上安装全局 MCP 命令：

```bash
npm install -g @mashiro39/ai-inspect-cli
```

2. 在用户的前端项目中安装 Vite 插件：

```bash
npm install -D @mashiro39/ai-inspect-vite-plugin
```

如果项目使用 pnpm 或 yarn，请使用对应包管理器：

```bash
pnpm add -D @mashiro39/ai-inspect-vite-plugin
yarn add -D @mashiro39/ai-inspect-vite-plugin
```

3. 修改用户项目的 `vite.config.ts` 或 `vite.config.js`：

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';

export default defineConfig({
  plugins: [vue(), aiInspect()],
});
```

如果项目已有 `plugins` 数组，只需要加入 `aiInspect()`。

4. 给用户的 MCP client 添加 ai-inspect server：

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

TOML 风格配置：

```toml
[mcp_servers.ai-inspect]
type = "stdio"
command = "ai-inspect"
args = ["mcp"]
```

5. 配置完成后，当用户说：

```text
启用 ai-insert
```

你应该直接调用 MCP tool `start_ai_inspect`，然后调用 `wait_for_frontend_request` 等待用户在浏览器里选择元素并点击发送。不要先去项目里搜索 `ai-insert` 功能。

6. `start_ai_inspect` 会：

- 启动或复用本地 daemon。
- 检查 Vite 插件是否接入。
- 启动或复用项目 dev server。
- 返回本地页面 URL。
- 不打开浏览器。
- 不启动任何固定 agent。

7. `wait_for_frontend_request` 会等待最多 10 分钟。用户在浏览器里点击右下角 `AI 调试`，选择元素并发送需求后，这个 tool 会返回：

- 用户需求
- 当前 selection
- 当前 session
- 相关源码上下文

然后根据用户需求修改代码。修改完成后，可调用 `reply_to_user` 把简短结果回写到浏览器面板。

如果 10 分钟内用户没有点击发送，本次等待会超时，并关闭本次 ai-inspect daemon / MCP 进程。

## 用户快速开始

### 1. 安装 MCP 命令

```bash
npm install -g @mashiro39/ai-inspect-cli
```

确认命令可用：

```bash
ai-inspect --help
```

### 2. 配置 MCP

把下面配置加到你的 MCP client / AI agent：

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

不同工具的 MCP 配置位置不同。核心信息只有三项：

- server name: `ai-inspect`
- command: `ai-inspect`
- args: `["mcp"]`

### 3. 给 Vite 项目安装插件

在你的前端项目目录执行：

```bash
npm install -D @mashiro39/ai-inspect-vite-plugin
```

pnpm：

```bash
pnpm add -D @mashiro39/ai-inspect-vite-plugin
```

yarn：

```bash
yarn add -D @mashiro39/ai-inspect-vite-plugin
```

### 4. 修改 Vite 配置

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';

export default defineConfig({
  plugins: [vue(), aiInspect()],
});
```

如果已经有插件：

```ts
export default defineConfig({
  plugins: [vue(), aiInspect(), otherPlugin()],
});
```

### 5. 启动项目

```bash
npm run dev
```

或：

```bash
pnpm dev
yarn dev
```

然后对你的 AI agent 说：

```text
启用 ai-insert
```

agent 会通过 MCP 调用 `start_ai_inspect`，启动 ai-inspect daemon，并返回本地页面地址。
随后 agent 会调用 `wait_for_frontend_request` 等待你在浏览器里发送需求。

## 浏览器里怎么用

页面右下角会出现 `AI 调试` 按钮。

常用流程：

1. 点击 `AI 调试`。
2. 点击 `选择`。
3. 在页面上点选要修改的元素。
4. 输入需求，例如“把这个按钮改成红色，并加一点 hover 效果”。
5. 点击 `发送`。
6. 如果 AI agent 正在等待 `wait_for_frontend_request`，它会自动拿到 selection/source/session 并继续修改代码。

快捷键：

- `Enter`：发送
- `Shift+Enter`：换行
- `Esc`：关闭面板
- `Alt+Shift+I`：打开调试面板

## MCP Tools

ai-inspect 暴露这些 MCP tools：

### `start_ai_inspect`

启动或检查 ai-inspect 工作流。

主要行为：

- 启动本地 daemon。
- 检查当前项目是否接入 Vite 插件。
- 启动或复用 dev server。
- 返回状态和本地 URL。

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

```bash
ai-inspect mcp
ai-inspect daemon
ai-inspect status
ai-inspect selection --json
ai-inspect source --context 80
ai-inspect sessions
ai-inspect reply --content "已完成"
ai-inspect clear
```

平时用户只需要配置 `ai-inspect mcp`。其他命令主要用于调试。

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

## 常见问题

### 页面没有出现 `AI 调试` 按钮

检查：

- 项目是否是 Vite dev server。
- `vite.config.ts/js` 是否加入了 `aiInspect()`。
- 是否重启了 dev server。

### agent 找不到 MCP tool

检查：

- 是否全局安装了 `@mashiro39/ai-inspect-cli`。
- 终端里 `ai-inspect mcp` 是否能启动。
- MCP 配置里的 `command` 是否是 `ai-inspect`。
- 如果 agent 运行环境找不到全局命令，可以把 `command` 改成 `ai-inspect` 的绝对路径。

查找路径：

```bash
which ai-inspect
```

### `start_ai_inspect` 没有打开浏览器

这是预期行为。它只返回本地 URL，不主动打开或刷新浏览器。

### 点击 `发送` 后 AI 没有继续改代码

请确认你已经先在 AI 对话里说了：

```text
启用 ai-insert
```

AI agent 需要先调用 `start_ai_inspect` 和 `wait_for_frontend_request`。如果没有处于等待状态，浏览器发送只会保存 session，不会主动唤醒任意 MCP client。

## 本地开发

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
