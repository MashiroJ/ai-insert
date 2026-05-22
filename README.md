# ui-inspect

让 `AI Agent` 看懂你浏览器里的前端页面。

ui-inspect 是一个 MCP 工具，把浏览器中选中的前端元素变成 AI agent 能理解的上下文。你在页面上点选元素、描述需求，支持 MCP 的 AI 工具就能基于真实 DOM、样式、源码位置来改代码。不绑定 Claude、Codex、Cursor 或任何指定 agent。

## 它能做什么

- 在浏览器中点选页面元素，`AI Agent` 拿到 DOM 快照、计算样式、源码文件位置
- 选中元素后用自然语言描述修改需求，Agent 基于真实上下文改代码
- 连续选择多个元素，每个目标分别写备注，统一发给 `AI Agent` 批量处理
- 选中报错组件，预览并确认 console 日志后交给 `AI Agent` 排查
- 任何支持 MCP 的 AI 工具都能用，不绑定特定平台

当前主力接入方式：Vite 插件。Webpack 插件处于早期实验阶段。

## 快速开始

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

TOML 格式：

```toml
[mcp_servers.ui-inspect]
type = "stdio"
command = "npx"
args = ["-y", "@ui-inspect/cli@latest", "mcp"]
```

也可以全局安装后配置 `"command": "ui-inspect"`：

```bash
npm install -g @ui-inspect/cli@latest
```

### 2. 安装 Vite 插件

```bash
npm install -D @ui-inspect/vite-plugin@latest
```

在 `vite.config.ts` 中加入 `uiInspect()`：

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { uiInspect } from '@ui-inspect/vite-plugin';

export default defineConfig({
  plugins: [vue(), uiInspect()],
});
```

支持 Vite `^2.9.0` 到 `^7.0.0`。

### 3. 启动你的项目

ui-inspect 不会替你启动业务项目。请按你的方式启动 dev server，然后打开页面：

```bash
npm run dev
```

## 使用方式

在 AI 对话中输入：

```text
启用 ui-inspect
```

AI 会调用 `start_ui_inspect` 检查环境，然后调用 `wait_for_frontend_request` 等待你操作。

页面中会出现 Diana 浮标。靠近或点击 Diana 会打开工具条，拖动可移动位置（位置会在本地保存）。

### Diana 工具条

- **源码线索** -- 点选元素后确认源码位置，可选择 IDE 打开
- **局部调整** -- 选中一个元素，填写修改要求，发送给 AI
- **批量调整** -- 连续选择多个元素，每个元素可写备注，统一发送
- **问题排查** -- 选中组件后预览 console 日志，确认后发送给 AI
- **历史记录** -- 查看最近的调试会话

发送后，浏览器面板会显示任务状态：`已发送` -> `AI 已接收` -> `处理中` -> `已完成` 或 `失败`。

如果 AI 在 10 分钟内没有等到浏览器发送，会自动超时关闭本次进程。

## 给 AI Agent 的接入说明

如果用户要求你帮他接入 ui-inspect，按以下流程操作：

1. 检查用户项目是否是 Vite 项目（`vite.config.ts` / `package.json`）
2. 安装 `@ui-inspect/vite-plugin@latest` 到用户前端项目
3. 在 Vite 配置中加入 `uiInspect()`
4. 指导用户在 MCP client 中配置 `@ui-inspect/cli@latest mcp`
5. 当用户说 **"启用 ui-inspect"** 时，直接调用 `start_ui_inspect`（不要搜索代码库）
6. 提醒用户自己启动前端项目并打开目标页面
7. 立即调用 `wait_for_frontend_request` 等待浏览器任务
8. 收到任务后，读取 `selection`、`targets`、`targetSources`、`session` 和用户备注
9. 批量任务：逐项处理所有 `targets`，不要只改第一个
10. 问题排查任务：先读 `diagnostics` 和 `runtimeSummary`，再定位修改
11. 开始修改前调用 `update_ui_task_status`（`working`）
12. 完成后调用 `update_ui_task_status`（`done`），再用 `reply_to_user` 回写浏览器面板

固定触发语：

```text
启用 ui-inspect
```

## 常见问题

### 页面没有出现 Diana

- 当前页面是否来自 Vite dev server
- `vite.config.ts/js` 是否加入了 `uiInspect()`
- 安装插件后是否重启了 dev server

### 点击源码线索没有反应

ui-inspect 会自动检测本机前端 IDE（Cursor、VS Code、WebStorm、Windsurf、Zed、Trae）。选择元素后会先弹出确认框。也可以指定编辑器：

```bash
UI_INSPECT_EDITOR=cursor
```

### `AI Agent` 找不到 MCP tool

- MCP 配置是否使用了 `npx -y @ui-inspect/cli@latest mcp`
- MCP client 是否已重启或重新加载配置

### 点击发送后 `AI Agent` 没继续改代码

AI 需要先调用 `start_ui_inspect` 和 `wait_for_frontend_request` 进入等待状态。如果 `AI Agent` 没在等待，浏览器发送只会保存 session。

### 如何更新

MCP 配置使用 `@latest` 时会自动使用最新版。前端项目中的 Vite 插件需要手动更新：

```bash
npm install -D @ui-inspect/vite-plugin@latest
```

## 数据与隐私

会话历史保存在目标项目的 `.ui-inspect/sessions.json`，建议加入 `.gitignore`。Diana 的位置保存在页面 localStorage。

问题排查模式只会发送你确认过的日志。ui-inspect 不会自动发送 cookies、localStorage、网络请求正文或截图。