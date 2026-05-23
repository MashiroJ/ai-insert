# ui-inspect

ui-inspect 是一个给前端开发者使用的通用 MCP 前端检查工具。

它把“我在浏览器里看到的这个元素”变成 AI coding agent 能理解的上下文：DOM、样式、框架组件信息、源码线索、用户备注和任务会话。你可以在页面上点选元素，再让支持 MCP 的 AI 工具继续改代码。

ui-inspect 不绑定 Claude、Codex、Cursor 或任何指定 agent。只要你的 AI 工具支持 MCP，就可以使用。

当前主力链路：Vite + Vue 3。  
当前版本支持多前端框架适配基础，包括 Vue、React、Vanilla DOM adapter，以及 Webpack、Rspack、Rsbuild 插件包的适配架构；Vite 插件仍是目前推荐和验证最充分的接入方式，Rspack / Rsbuild 是新增适配入口。

## 你能用它做什么

- 在浏览器中点选页面元素，让 AI 拿到真实页面上下文。
- 直接定位元素对应的源码文件。
- 选择单个元素，描述想怎么改，再交给 AI。
- 连续选择多个元素，分别写备注，再统一发给 AI 批量处理。
- 选择可能报错的组件，确认 console 日志后交给 AI 排查。
- Diana 悬浮入口可拖动，避免挡住页面元素；位置会在本地保存。

## 包名

普通用户通常按项目类型选择 CLI 和对应构建插件：

```bash
@ui-inspect/cli
@ui-inspect/vite-plugin
@ui-inspect/rspack-plugin
@ui-inspect/rsbuild-plugin
```

内部依赖会自动安装：

```bash
@ui-inspect/shared
@ui-inspect/server
@ui-inspect/protocol
@ui-inspect/browser-adapter
@ui-inspect/browser-ui
```

当前 npm 组织下发布的包：

```bash
@ui-inspect/cli
@ui-inspect/server
@ui-inspect/protocol
@ui-inspect/shared
@ui-inspect/vite-plugin
@ui-inspect/browser-adapter
@ui-inspect/browser-ui
@ui-inspect/webpack-plugin
@ui-inspect/rspack-plugin
@ui-inspect/rsbuild-plugin
```

其中 `@ui-inspect/vite-plugin` 仍是验证最充分的推荐入口；`@ui-inspect/webpack-plugin`、`@ui-inspect/rspack-plugin`、`@ui-inspect/rsbuild-plugin` 适合非 Vite 项目接入和适配验证。

## 快速安装

### 1. 配置 MCP Server

在你的 MCP client 配置中加入：

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

如果你的 MCP client 使用 TOML：

```toml
[mcp_servers.ui-inspect]
type = "stdio"
command = "npx"
args = ["-y", "@ui-inspect/cli@latest", "mcp"]
```

你也可以全局安装：

```bash
npm install -g @ui-inspect/cli@latest
```

然后配置：

```json
{
  "mcpServers": {
    "ui-inspect": {
      "command": "ui-inspect",
      "args": ["mcp"]
    }
  }
}
```

### 2. 给前端项目安装 Vite 插件

在你的 Vite 项目目录执行：

```bash
npm install -D @ui-inspect/vite-plugin@latest
```

pnpm：

```bash
pnpm add -D @ui-inspect/vite-plugin@latest
```

yarn：

```bash
yarn add -D @ui-inspect/vite-plugin@latest
```

Vite peer 版本支持 `^2.9.0` 到 `^7.0.0`。

### 3. 修改 Vite 配置

在 `vite.config.ts` 或 `vite.config.js` 中加入 `uiInspect()`：

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { uiInspect } from '@ui-inspect/vite-plugin';

export default defineConfig({
  plugins: [vue(), uiInspect()],
});
```

如果项目已有插件，只需要把 `uiInspect()` 加进 `plugins`：

```ts
export default defineConfig({
  plugins: [
    vue(),
    uiInspect(),
    otherPlugin(),
  ],
});
```

### 4. 自己启动前端项目

ui-inspect 不会替你启动业务项目，因为一个仓库里可能有多个系统、多个启动命令或特殊环境变量。

请按你的项目方式启动：

```bash
npm run dev
```

或：

```bash
pnpm dev
yarn dev
```

然后打开你的页面。

### Webpack 项目

当前提供 `@ui-inspect/webpack-plugin`，用于后续适配非 Vite 项目。它目前是实验能力，适合开发者预览和参与测试；真实项目优先推荐 Vite 插件。

```bash
npm install -D @ui-inspect/webpack-plugin@latest
```

### Rspack 项目

Rspack 项目可以使用 `@ui-inspect/rspack-plugin`。它是新增适配入口，适合在 Rspack dev server 中验证；如果你可以选择构建工具，仍建议优先使用验证最充分的 Vite 插件。

```bash
npm install -D @ui-inspect/rspack-plugin@latest
```

在 `rspack.config.ts` 或 `rspack.config.js` 中加入 `uiInspect()`：

```ts
import { defineConfig } from '@rspack/cli';
import { uiInspect } from '@ui-inspect/rspack-plugin';

export default defineConfig({
  plugins: [
    uiInspect(),
  ],
});
```

### Rsbuild 项目

Rsbuild 项目可以使用 `@ui-inspect/rsbuild-plugin`。它是新增适配入口，会通过 Rsbuild 插件机制接入底层 Rspack dev 流程。

```bash
npm install -D @ui-inspect/rsbuild-plugin@latest
```

在 `rsbuild.config.ts` 或 `rsbuild.config.js` 中加入 `pluginUiInspect()`：

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginUiInspect } from '@ui-inspect/rsbuild-plugin';

export default defineConfig({
  plugins: [
    pluginUiInspect(),
  ],
});
```

## 使用方式

在 AI coding agent 对话中输入：

```text
启用 ui-inspect
```

AI 应该调用 MCP tool `start_ui_inspect`，然后立刻调用 `wait_for_frontend_request` 等待浏览器发送任务。

页面中会出现 Diana：

- 靠近 Diana：显示上方图标工具条。
- 点击 Diana：也会打开工具条。
- 拖动 Diana：移动入口，避免挡住页面元素。
- 刷新页面：Diana 会记住上次位置。

Diana 工具条包含：

- 源码线索：点选元素后确认源码位置，并选择 IDE 打开。
- 问题排查：选择可能报错的组件，预览并确认 console 日志后发送给 AI。
- 局部调整：选择一个元素，填写修改要求，发送给 AI。
- 批量调整：连续选择多个元素，每个目标可写备注，再统一发送给 AI。
- 历史记录：查看最近的调试会话。

问题排查模式只会发送你确认过的日志。Diana 会预览最近的 `console.error`、`console.warn`、页面异常和未处理 Promise 异常；默认选择错误日志，警告日志需要你手动选择。日志可能包含 token、邮箱、订单号等敏感信息，请确认后再发送。ui-inspect 不会自动发送 cookies、localStorage、网络请求正文或截图。

发送后，浏览器面板会显示任务状态：`已发送`、`AI 已接收`、`处理中`、`已完成`、`失败`。

如果 AI 在 10 分钟内没有等到浏览器发送，`wait_for_frontend_request` 会超时，并关闭本次 ui-inspect daemon / MCP 进程。

## 给 AI Agent 的操作说明

如果用户把这个仓库或 README 发给你，并希望你帮他接入 ui-inspect，请按这个流程执行：

1. 判断用户项目是否是 Vite 项目，优先检查 `vite.config.ts`、`vite.config.js`、`package.json`。
2. 安装 `@ui-inspect/vite-plugin@latest` 到用户前端项目。
3. 在 Vite 配置中引入并加入 `uiInspect()`。
4. 指导用户在 MCP client 中配置 `@ui-inspect/cli@latest mcp`。
5. 当用户说 `启用 ui-inspect` 时，不要搜索业务功能，直接调用 `start_ui_inspect`。
6. 提醒用户自己启动前端项目，并打开要检查的页面。
7. 立即调用 `wait_for_frontend_request`。
8. 收到任务后，读取 `selection`、`targets`、`targetSources`、`session` 和用户备注。
9. 如果是批量任务，逐项处理 `targets` 和 `targetSources`，不要只改第一个目标。
10. 如果是问题排查任务，先阅读 `diagnostics`、`runtimeSummary` 和 `sourceHints`，再定位和修改。
11. 开始修改前调用 `update_ui_task_status` 设置为 `working`。
12. 修改完成后调用 `update_ui_task_status` 设置为 `done`，再用 `reply_to_user` 把简短结果回写到浏览器面板。

固定触发语是：

```text
启用 ui-inspect
```

## MCP Tools

### `start_ui_inspect`

启动或检查 ui-inspect 工作流。

它会：

- 启动或复用本地 daemon。
- 检查当前项目是否接入 Vite 插件。
- 返回 daemon 和插件接入状态。

它不会：

- 启动用户项目 dev server。
- 打开或刷新浏览器。
- 启动 Claude、Codex、Cursor 或任何固定 agent。

### `wait_for_frontend_request`

等待用户在浏览器中选择元素并点击发送。

默认最多等待 10 分钟。成功后返回：

- 用户整体需求
- 当前 session
- 当前 selection
- 多个 targets
- 每个目标的备注
- 相关源码上下文
- 元素上下文摘要
- 批量目标摘要
- 源码候选线索
- 用户确认过的运行时日志摘要

### `get_frontend_selection`

读取当前浏览器选中的前端元素。

常见内容包括：

- 页面 URL
- CSS selector
- DOM 快照
- 元素尺寸
- 计算样式
- 父级、同级、子级摘要
- 表单和可访问名称线索
- Vue 组件信息
- 源码文件线索
- 用户输入需求

### `get_frontend_source`

根据 selection 的源码线索读取附近代码。

示例参数：

```json
{
  "context": 80
}
```

### `get_frontend_sessions`

读取最近的调试会话和消息历史。

### `update_ui_task_status`

更新浏览器面板里的任务状态。

示例：

```json
{
  "status": "working"
}
```

支持：

```text
claimed
working
done
failed
```

### `reply_to_user`

把 AI 的简短回复写回浏览器面板。

示例：

```json
{
  "content": "已修改按钮样式，并保留了现有交互。"
}
```

## CLI 命令

普通用户通常只需要：

```bash
npx -y @ui-inspect/cli@latest mcp
```

全局安装后：

```bash
ui-inspect mcp
```

调试命令：

```bash
ui-inspect daemon
ui-inspect status
ui-inspect selection --json
ui-inspect source --context 80
ui-inspect sessions
ui-inspect reply --content "已完成"
ui-inspect clear
```

## 工作原理

ui-inspect 现在按通用 MCP + 浏览器上下文采集拆成几层：

- 集成插件：Vite 插件是主力入口，Webpack 插件处于早期实验阶段。
- Browser Adapter：抽象 Vue、React、Vanilla DOM 等框架差异，生成组件和源码线索。
- Browser UI：Diana、菜单、面板、toast、样式等浏览器端 UI 模块。
- 浏览器运行层：负责点选元素、确认源码线索、批量调整、输入需求、查看历史和展示任务状态。
- 本地 daemon：默认运行在 `http://127.0.0.1:17321`，保存 selection 和 session。
- MCP server：把浏览器采集到的上下文提供给 AI agent。

浏览器不会直接改代码。点击发送只会把选择和需求记录到 daemon session。如果 AI agent 正在调用 `wait_for_frontend_request`，这个 tool 会返回上下文，agent 才会继续修改代码。

## 本地数据

会话历史保存在目标项目：

```text
<project>/.ui-inspect/sessions.json
```

`.ui-inspect/` 是本地调试状态目录，通常不需要提交到 git。

建议加入 `.gitignore`：

```gitignore
.ui-inspect/
```

Diana 的浏览器位置保存在当前页面的 `localStorage` 中。

## 常见问题

### 页面没有出现 Diana

检查：

- 当前页面是否来自 Vite dev server。
- `vite.config.ts/js` 是否加入了 `uiInspect()`。
- 安装插件后是否重启了 dev server。

### 点击源码线索没有反应

ui-inspect 会优先尝试常见编辑器命令，例如：

```text
cursor
code
webstorm
windsurf
zed
trae
```

选择元素后会先弹出确认框，避免误打开。确认框会列出本机检测到的常用前端 IDE；如果都不可用，macOS 上会回退到 `open`。

你也可以指定：

```bash
UI_INSPECT_EDITOR=cursor
```

### AI 找不到 MCP tool

检查：

- MCP 配置是否使用了 `npx -y @ui-inspect/cli@latest mcp`。
- 如果使用全局安装，终端里 `ui-inspect mcp` 是否能启动。
- MCP client 是否已经重启或重新加载配置。

### `start_ui_inspect` 没有启动项目

这是预期行为。ui-inspect 不负责运行你的业务项目。请自己使用项目原本的 dev 命令启动。

### 点击发送后 AI 没继续改代码

请先在 AI 对话里输入：

```text
启用 ui-inspect
```

AI 需要先调用 `start_ui_inspect` 和 `wait_for_frontend_request`。如果 AI 没有处于等待状态，浏览器发送只会保存 session，不会主动唤醒任意 MCP client。

### 如何更新到最新版

如果 MCP 配置使用 `@latest`，通常会使用 npm 最新版本：

```json
{
  "command": "npx",
  "args": ["-y", "@ui-inspect/cli@latest", "mcp"]
}
```

如果你全局安装过：

```bash
npm install -g @ui-inspect/cli@latest
```

前端项目里的 Vite 插件也需要更新：

```bash
npm install -D @ui-inspect/vite-plugin@latest
```

## 维护者开发

普通用户不需要执行这些命令。

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test:runtime-monitor
pnpm --filter @ui-inspect/vite-plugin size
node packages/cli/dist/index.js mcp
```

`client-source.ts` 已拆分为多个 browser client source fragment，保持主入口小而清晰；`test:runtime-monitor` 会校验最终生成的浏览器脚本可解析，并确认 runtime monitor、Diana、selection、task panel 和 session 模块都被正确拼装。

发布 npm 包：

```bash
git switch dev
git switch -c release/vX.Y.Z
pnpm run publish:npm:dry-run
pnpm run publish:npm
```

发布只应在 `release/vX.Y.Z` 或 `main` 分支执行。完整分支和发布规则见 [docs/release-flow.md](docs/release-flow.md)。

发布脚本会发布完整包拓扑：

```text
protocol -> shared / server / browser-adapter -> browser-ui -> vite-plugin / webpack-plugin -> cli
```
