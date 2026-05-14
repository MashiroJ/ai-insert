# ai-inspect

面向 AI 编程助手的通用 MCP 前端检查上下文服务。当前首要支持场景是 Vite + Vue 3。

ai-inspect 可以让你在本地页面中选择一个元素，采集它的 DOM、Vue 组件、样式和源码线索，保存到本地 daemon，并通过标准 MCP tools 提供给任意支持 MCP 的 agent 使用。

用户口径里的 `ai-insert`、`AI insert`、`AI 插入`、`AI 调试` 都指同一套 ai-inspect 工作流。

推荐固定触发语：

```text
启用 ai-insert
```

当任意 MCP agent 已配置 ai-inspect MCP 后，看到这句话应直接调用 `start_ai_inspect`，不要先去项目里搜索是否存在 `ai-insert` 功能。

## 包含内容

- `@mashiro39/ai-inspect-vite-plugin`：给 Vue/Vite 项目注入页面内 `AI 调试` 面板。
- `ai-inspect daemon`：本地 HTTP daemon，默认运行在 `http://127.0.0.1:17321`。
- `ai-inspect mcp`：通用 MCP 服务，暴露前端选择、源码片段、历史会话等工具。
- 薄 CLI：用于启动 MCP、daemon，以及调试 selection/session/source。

## npm 安装

全局安装 MCP 命令：

```bash
npm install -g @mashiro39/ai-inspect-cli@0.2.0
ai-inspect mcp
```

业务 Vite 项目安装浏览器插件：

```bash
yarn add -D @mashiro39/ai-inspect-vite-plugin@0.2.0
```

在 `vite.config.ts` 中接入：

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';

export default defineConfig({
  plugins: [vue(), aiInspect()],
});
```

## MCP 配置

给你的 MCP client/agent 添加 stdio server：

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

TOML 风格：

```toml
[mcp_servers.ai-inspect]
type = "stdio"
command = "ai-inspect"
args = ["mcp"]
```

## 一键安装脚本

生成 release 包后可使用：

```bash
./release/ai-inspect-0.2.0/install.sh
```

常用非交互命令：

```bash
./release/ai-inspect-0.2.0/install.sh --mode mcp
./release/ai-inspect-0.2.0/install.sh --mode vite --project /path/to/vite-vue-project
./release/ai-inspect-0.2.0/install.sh --mode all --project /path/to/vite-vue-project
```

安装脚本默认使用公网 npm 包。只有显式传入 `--source local` 时，才会使用 release 目录里的本地 tgz：

```bash
./release/ai-inspect-0.2.0/install.sh --source local --mode all --project /path/to/vite-vue-project
```

业务项目安装 Vite 插件时优先使用 Yarn。检测顺序是：

1. `packageManager` 中显式声明 Yarn
2. `yarn.lock`
3. `packageManager` 中声明 pnpm/npm
4. `pnpm-lock.yaml`
5. 本机 Yarn
6. npm

## MCP 工作流

当 agent 配置了 `ai-inspect mcp` 后，对它说：

```text
启用 ai-insert
```

MCP 工具 `start_ai_inspect` 会执行这些动作：

- 启动或复用本地 daemon。
- 检查并安装 `@mashiro39/ai-inspect-vite-plugin`。
- 检查并修改 Vite 配置，挂载 `aiInspect()`。
- 启动或复用项目 dev server。
- 只返回检测到的本地 URL，不主动打开或刷新浏览器。
- 不启动任何特定 agent，也不自动执行代码修改。

这些说法也应触发同一个工具：

```text
启用 ai-inspect
启用 ai-insert
打开 AI 调试
帮我开启浏览器选元素让 AI 改代码
```

MCP 暴露工具：

- `start_ai_inspect`
- `get_frontend_selection`
- `get_frontend_source`
- `get_frontend_sessions`
- `reply_to_user`

## 浏览器使用

启动业务前端项目后，页面右下角会出现 `AI 调试` 按钮。

面板交互：

- 点击 `AI 调试`：先打开调试面板，不会立刻进入框选。
- 点击 `选择`：进入元素框选模式。
- 选中元素后：回到面板，并保留元素高亮框。
- 输入需求后点击 `发送`：只把用户指令和当前选择记录到 daemon session。
- 点击 `历史`：查看最近会话。
- 历史会话里再次点击 `选择`：最新框选会成为该会话的当前选择。
- 历史会话右侧红色 `删除`：删除旧会话。

快捷键：

- `Enter`：发送
- `Shift+Enter`：换行
- `Esc`：关闭面板
- `Alt+Shift+I`：打开 AI 调试面板

## 工作原理

ai-inspect 分成四层：

- Vite 插件：只在 dev server 中注入浏览器脚本。
- 浏览器面板：负责元素选择、输入指令、历史会话和删除历史。
- 本地 daemon：运行在 `http://127.0.0.1:17321`，保存最新选择和会话历史。
- MCP server：让任意 MCP agent 读取结构化前端上下文，并可通过 `reply_to_user` 回写浏览器面板。

浏览器不会直接改代码，也不会启动某个固定 agent。它只会把结构化选择信息 POST 给 daemon，包括：

- 页面 URL 和标题
- CSS selector
- DOM 快照
- 元素尺寸
- 计算样式
- Vue 组件名
- Vue 组件链
- props 和 attrs
- Vue `__file` 源码提示
- 用户输入的调整指令
- 当前 session id

daemon 会把最新选择保存在内存中，并把历史会话落盘到当前业务项目：

```text
<target-project>/.ai-insert/sessions.json
```

历史是按 session 管理的：

- 普通新选择会创建新 session。
- 从 `历史` 进入的会话会复用旧 session。
- 在历史会话里重新点击 `选择`，会用最新框选替换该会话的当前选择。
- 删除历史会话会同时清理当前 selection、面板状态和最近会话记录。

`.ai-insert/` 放在业务项目中，是为了让历史跟着项目走。Vite 插件会把 `.ai-insert/` 加入 watch ignore，所以写入历史不会触发 HMR 或整页刷新。

## 本地开发

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js daemon
node packages/cli/dist/index.js selection --json
node packages/cli/dist/index.js source --context 80
node packages/cli/dist/index.js mcp
```

## 生成 release 包

```bash
pnpm release:local
```

输出目录：

```text
release/ai-inspect-<version>
```

release 包包含：

- npm tarballs
- `install.sh`
- `install.ps1`
- `configure-mcp.mjs`
- `patch-vite-config.mjs`
- 中文 README

## 发布到 npm

公网 npm 包名：

- `@mashiro39/ai-inspect-protocol`
- `@mashiro39/ai-inspect-server`
- `@mashiro39/ai-inspect-vite-plugin`
- `@mashiro39/ai-inspect-cli`

当前使用个人 npm scope `@mashiro39`，因为 `@ai-inspect` 组织 scope 不可用。

发布流程：

```bash
npm login --registry https://registry.npmjs.org
npm whoami --registry https://registry.npmjs.org
pnpm install
pnpm run publish:npm:dry-run
pnpm run publish:npm
```

发布脚本会自动执行 typecheck、生成本地 release 包、按依赖顺序发布 npm 包，并验证 registry 版本。

如果 npm 要求一次性验证码：

```bash
node scripts/publish-npm.mjs --yes --otp 123456
```

发布后用户可以直接安装：

```bash
npm install -g @mashiro39/ai-inspect-cli
npm install -D @mashiro39/ai-inspect-vite-plugin
```
