# ai-inspect 本地安装包

这个目录用于给同事离线安装 ai-inspect。

版本：0.1.0

包含：

- MCP 命令：`ai-inspect mcp`
- Vue/Vite 项目插件：右下角 `AI 调试` 按钮、调试面板、元素选择、高亮、历史会话

## macOS / Linux 交互安装

```bash
./install.sh
```

## macOS / Linux 非交互示例

```bash
./install.sh --mode mcp --agent codex
./install.sh --mode mcp --agent claude
./install.sh --mode vite --project /path/to/vite-vue-project
./install.sh --mode all --agent claude --project /path/to/vite-vue-project
# 明确指定 local 时，才使用当前目录内的 tgz 包
./install.sh --source local --mode all --agent codex --project /path/to/vite-vue-project
```

Claude Code 默认写入 user scope，全局可用；一般只需要安装一次。如果要写入当前项目作用域：

```bash
./install.sh --mode mcp --agent claude --claude-scope local
```

默认使用公网 npm 安装；只有显式传入 `--source local` 时才使用本地 tgz：

```bash
npm install -g @mashiro39/ai-inspect-cli@0.1.0
npm install -D @mashiro39/ai-inspect-vite-plugin@0.1.0
```

## Windows PowerShell 交互安装

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
```

## Windows PowerShell 非交互示例

```powershell
.\install.ps1 -Mode mcp -Agent claude
.\install.ps1 -Mode vite -Project "C:\path\to\vite-vue-project"
.\install.ps1 -Mode all -Agent codex -Project "C:\path\to\vite-vue-project"
.\install.ps1 -Source local -Mode all -Agent codex -Project "C:\path\to\vite-vue-project"
```

## Vite 配置

安装脚本会尝试自动修改 `vite.config.ts/js/mts/mjs`。如果自动修改失败，请手动添加：

```ts
import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';

export default defineConfig({
  plugins: [vue(), aiInspect()],
});
```

## 运行

正常使用时只需要启动你的业务前端项目，例如 `yarn dev` / `pnpm dev` / `npm run dev`。

固定触发语：

```text
启用 ai-insert
```

在 Codex 或 Claude 里说“启用 ai-insert”时，AI 应先调用 MCP 工具 `start_ai_inspect`。该工具会静默启动本地 daemon，自动检查/补接入 `@mashiro39/ai-inspect-vite-plugin`，启动或复用项目 dev server，检测到 URL 后只返回地址，不主动打开或刷新浏览器，并启动 watcher，不应先去项目里搜索 ai-insert 功能。

业务项目安装 Vite 插件时优先使用 Yarn。检测顺序是：`packageManager` 中显式 Yarn、`yarn.lock`、`packageManager` 中的 pnpm/npm、`pnpm-lock.yaml`、本机 Yarn、npm。

watcher 启动后，浏览器面板点击 `发送` 会自动触发 Codex 或 Claude 处理最新选择，并把结构化输出实时流式回写到浏览器面板。

浏览器面板交互：

- 点击右下角 `AI 调试` 先打开面板，不会立刻进入框选。
- 点击 `选择` 后进入元素框选，选中后保留高亮并回到面板。
- 点击 `发送` 后，watcher 会把最新选择和输入内容交给 Codex 或 Claude。
- `Enter` 发送，`Shift+Enter` 换行，`Esc` 关闭面板。

运行时状态默认写入当前业务项目的 `.ai-insert/` 目录。历史会话会保存到 `.ai-insert/sessions.json`，刷新页面或重启本地 daemon 后，可以打开调试面板并通过 `历史` 按钮继续查看最近会话；历史会话里再次点击 `选择` 后，最新框选会成为该会话的当前选择。历史列表支持红色 `删除` 按钮清理旧会话。Vite 插件会忽略 `.ai-insert/`，写入历史和日志不会触发页面刷新。

## 工作原理

ai-inspect 分成四层：

- Vite 插件：只在 dev server 中注入浏览器脚本。
- 浏览器面板：负责元素选择、输入指令、历史会话和删除历史。
- 本地 daemon：运行在 `http://127.0.0.1:17321`，保存最新选择和会话历史。
- MCP + watcher：让 Codex/Claude 读取结构化前端上下文，并在浏览器点击 `发送` 后启动对应 AI。

浏览器不会直接改代码。它会把以下结构化信息 POST 给 daemon：

- 页面 URL 和标题
- CSS selector、DOM 快照、元素尺寸、计算样式
- Vue 组件名、组件链、props、attrs、`__file` 源码提示
- 用户输入的调整指令
- 当前 session id

daemon 会把会话保存到当前业务项目：

```text
<target-project>/.ai-insert/sessions.json
```

watcher 轮询 daemon，发现新的用户消息后，在业务项目目录中启动 Codex 或 Claude。AI 会通过 MCP 工具读取当前选择、源码片段和历史会话，然后把输出流式写回浏览器面板。

普通新选择会创建新 session；从 `历史` 进入的会话会复用旧 session。如果在历史会话里重新点击 `选择`，最新框选会替换该会话的当前选择。

`.ai-insert/` 放在业务项目中，是为了让历史跟着项目走；Vite 插件会把 `.ai-insert/` 加入 watch ignore，所以写入历史和日志不会导致页面刷新。

## Codex 代理与 Reconnecting

首版开始，ai-inspect 触发 Codex 时默认使用 HTTP/SSE 传输，并关闭 Codex 默认的 WebSocket 优先路径：

```toml
model_provider = "openai-http"
supports_websockets = false
```

这样可以避免本地代理、Clash、SOCKS `ALL_PROXY` 等环境下常见的：

- `Reconnecting... 2/5`
- `tls handshake eof`
- `stream disconnected before completion`

watcher 还会自动整理 Codex 子进程代理环境：

- 保留 `HTTP_PROXY/http_proxy` 和 `HTTPS_PROXY/https_proxy`
- 当存在 HTTP/HTTPS 代理时，移除 SOCKS `ALL_PROXY/all_proxy`
- 为本地 daemon 请求补齐 `NO_PROXY/no_proxy=localhost,127.0.0.1,::1`

如果需要临时恢复 Codex 原生 WebSocket 行为：

```bash
AI_INSPECT_CODEX_TRANSPORT=default ai-inspect watch --project /path/to/vite-vue-project --agent codex
```

如果不用 MCP，也可以手动启动：

```bash
ai-inspect daemon
ai-inspect watch --project /path/to/vite-vue-project
```

MCP 工具：

- `start_ai_inspect`
- `get_frontend_selection`
- `get_frontend_source`
- `get_frontend_sessions`
- `reply_to_user`

## 发布到 npm

公网 npm 发布使用个人 scope `@mashiro39`。MCP 命令仍然叫 `ai-inspect mcp`。

```bash
npm login --registry https://registry.npmjs.org
npm whoami --registry https://registry.npmjs.org
pnpm install
pnpm run publish:npm:dry-run
pnpm run publish:npm
```

发布脚本会自动执行 typecheck、生成本地 release 包、按依赖顺序发布 npm 包，并在发布后验证 registry 版本。

发布后用户可以：

```bash
npm install -g @mashiro39/ai-inspect-cli
npm install -D @mashiro39/ai-inspect-vite-plugin
```
