# ai-inspect 本地安装包

这个目录用于安装 ai-inspect：一个通用 MCP 前端检查上下文服务。

版本：0.2.0

包含：

- MCP 命令：`ai-inspect mcp`
- Vue/Vite 项目插件：右下角 `AI 调试` 按钮、调试面板、元素选择、高亮、历史会话
- 本地 daemon：保存 selection 和 session，供任意 MCP agent 读取

## 安装

```bash
./install.sh
```

```bash
./install.sh --mode mcp
./install.sh --mode vite --project /path/to/vite-vue-project
./install.sh --mode all --project /path/to/vite-vue-project
./install.sh --source local --mode all --project /path/to/vite-vue-project
```

Windows PowerShell：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
.\install.ps1 -Mode mcp
.\install.ps1 -Mode vite -Project "C:\path\to\vite-vue-project"
.\install.ps1 -Mode all -Project "C:\path\to\vite-vue-project"
```

默认使用公网 npm 安装；只有显式传入 `--source local` 时才使用当前目录内的 tgz 包。

## MCP 配置

`./install.sh --mode mcp` 和 `.\install.ps1 -Mode mcp` 会安装 `ai-inspect` 命令，并输出通用 MCP 配置片段。把其中一个片段添加到你使用的 MCP client/agent：

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

```toml
[mcp_servers.ai-inspect]
type = "stdio"
command = "ai-inspect"
args = ["mcp"]
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

任意 MCP agent 看到这句话时，应调用 `start_ai_inspect`。该工具会静默启动本地 daemon，自动检查/补接入 `@mashiro39/ai-inspect-vite-plugin`，启动或复用项目 dev server，并返回检测到的 URL；它不会打开浏览器，也不会启动任何特定 agent。

浏览器面板交互：

- 点击右下角 `AI 调试` 先打开面板，不会立刻进入框选。
- 点击 `选择` 后进入元素框选，选中后保留高亮并回到面板。
- 点击 `发送` 后，面板只会把最新选择和输入内容记录到 daemon session；由当前 MCP agent 读取并决定如何处理。
- `Enter` 发送，`Shift+Enter` 换行，`Esc` 关闭面板。

运行时状态默认写入当前业务项目的 `.ai-insert/` 目录。历史会话会保存到 `.ai-insert/sessions.json`；Vite 插件会忽略该目录，写入历史不会触发页面刷新。

## 工作原理

ai-inspect 分成四层：

- Vite 插件：只在 dev server 中注入浏览器脚本。
- 浏览器面板：负责元素选择、输入指令、历史会话和删除历史。
- 本地 daemon：运行在 `http://127.0.0.1:17321`，保存最新选择和会话历史。
- MCP server：通过标准 MCP tools 向任意 agent 暴露结构化前端上下文。

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

普通新选择会创建新 session；从 `历史` 进入的会话会复用旧 session。如果在历史会话里重新点击 `选择`，最新框选会替换该会话的当前选择。

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
