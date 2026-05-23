# ui-inspect

让 `AI Agent` 看懂你浏览器里的前端页面。

ui-inspect 是一个给前端开发者使用的通用 MCP 前端检查工具。

它把“我在浏览器里看到的这个元素”变成 AI coding agent 能理解的上下文：DOM、样式、框架组件信息、源码线索、用户备注和任务会话。你可以在页面上点选元素，再让支持 MCP 的 AI 工具继续改代码。

ui-inspect 不绑定 Claude、Codex、Cursor 或任何指定 agent。只要你的 AI 工具支持 MCP，就可以使用。

ui-inspect 面向通用前端项目：可以采集 DOM、样式、框架组件信息和源码线索，再通过 MCP 交给 AI coding agent。

当前版本已支持 Vite、Next.js、Webpack、Rspack、Rsbuild 等前端工程入口。Vite 仍是验证最充分、接入最顺滑的入口；Next.js 是当前重点优化入口；Webpack、Rspack、Rsbuild 适合已有项目按插件方式接入。

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
@ui-inspect/webpack-plugin
@ui-inspect/rspack-plugin
@ui-inspect/rsbuild-plugin
@ui-inspect/next
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
@ui-inspect/next
```

其中 `@ui-inspect/vite-plugin` 是验证最充分的推荐入口；`@ui-inspect/next` 用于 Next.js App Router / Pages Router 项目；`@ui-inspect/webpack-plugin`、`@ui-inspect/rspack-plugin`、`@ui-inspect/rsbuild-plugin` 适合已有非 Vite 项目按插件方式接入。

## 支持矩阵

| 项目类型 | 推荐程度 | 接入方式 | dev 支持状态 | 备注 |
|---|---|---|---|---|
| Vite | 推荐，验证最充分 | 安装 `@ui-inspect/vite-plugin`，在 Vite 配置中加入 `uiInspect()` | 支持 Vite dev server | 当前最顺滑入口，AI 可自动或半自动 patch 配置 |
| Next.js | 推荐，当前重点优化 | 安装 `@ui-inspect/next`，加入 `UiInspectScript`，并添加 Diana API route | 支持 App Router / Pages Router dev | 组件 + API route 接入，可覆盖 Webpack dev 和 Turbopack dev |
| Webpack | 可用，适合已有项目 | 安装 `@ui-inspect/webpack-plugin`，在 Webpack 插件列表中加入 `uiInspect()` | 支持 Webpack dev server 适配 | 需要按项目配置形态手动接入 |
| Rspack | 可用，适合已有项目 | 安装 `@ui-inspect/rspack-plugin`，在 Rspack 插件列表中加入 `uiInspect()` | 支持 Rspack dev server 适配 | 与 Webpack 插件形态相近 |
| Rsbuild | 可用，适合已有项目 | 安装 `@ui-inspect/rsbuild-plugin`，在 Rsbuild 插件列表中加入 `pluginUiInspect()` | 支持 Rsbuild dev 适配 | 通过 Rsbuild 插件机制接入底层 dev 流程 |

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

### 2. 选择前端项目接入方式

先根据你的项目类型选择对应入口。Vite 是验证最充分的入口；Next.js 是当前重点优化入口；Webpack、Rspack、Rsbuild 项目按插件方式接入。

### Vite 项目

在你的 Vite 项目目录安装插件：

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

### Webpack 项目

Webpack 项目可以使用 `@ui-inspect/webpack-plugin`。它适合已有 Webpack dev server 项目按插件方式接入。

```bash
npm install -D @ui-inspect/webpack-plugin@latest
```

在 `webpack.config.ts` 或 `webpack.config.js` 的插件列表中加入 `uiInspect()`：

```ts
import { uiInspect } from '@ui-inspect/webpack-plugin';

export default {
  plugins: [
    uiInspect(),
  ],
};
```

### Rspack 项目

Rspack 项目可以使用 `@ui-inspect/rspack-plugin`。它适合在 Rspack dev server 中按插件方式接入。

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

Rsbuild 项目可以使用 `@ui-inspect/rsbuild-plugin`。它会通过 Rsbuild 插件机制接入底层 dev 流程。

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

### Next.js 项目

Next.js 项目可以使用 `@ui-inspect/next`。Next v1 采用组件式接入，而不是只依赖 `next.config.js` 注入，这样可以同时覆盖 Webpack dev 和 Turbopack dev。

```bash
npm install -D @ui-inspect/next@latest
```

App Router 在 `app/layout.tsx` 中加入 `UiInspectScript`：

```tsx
import { UiInspectScript } from '@ui-inspect/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <UiInspectScript />
      </body>
    </html>
  );
}
```

然后添加 `app/api/ui-inspect/diana/route.ts`：

```ts
export { GET } from '@ui-inspect/next/app';
```

Pages Router 在 `pages/_app.tsx` 中加入 `UiInspectScript`：

```tsx
import type { AppProps } from 'next/app';
import { UiInspectScript } from '@ui-inspect/next';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <UiInspectScript />
    </>
  );
}
```

然后添加 `pages/api/ui-inspect/diana.ts`：

```ts
export { dianaHandler as default } from '@ui-inspect/next/pages';
```

### Next 接入检查

当 AI 调用 `start_ui_inspect` 时，CLI 会识别当前项目是否为 Next.js，并检查接入状态。Next 项目不会被自动 patch；工具会返回缺失项和下一步，让 AI 或维护者按项目实际路由补齐。

CLI 会检查：

- `package.json` 中是否已安装 `@ui-inspect/next`。
- App Router 的 `app/layout.*` 或 `src/app/layout.*` 中是否使用了 `UiInspectScript`。
- Pages Router 的 `pages/_app.*` 或 `src/pages/_app.*` 中是否使用了 `UiInspectScript`。
- App Router 是否存在 `app/api/ui-inspect/diana/route.*` 或 `src/app/api/ui-inspect/diana/route.*`；公开 API 写法应通过 `GET` 暴露 Diana route。
- Pages Router 是否存在 `pages/api/ui-inspect/diana.*` 或 `src/pages/api/ui-inspect/diana.*`；公开 API 写法应通过 `dianaHandler` 暴露 Diana API。

### 3. 自己启动前端项目

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
- CSS 调试：选择一个元素，在浏览器里预览调整样式；可以用面板改属性，也可以拖拽元素表达移动或尺寸意图，再把样式 diff 和源码线索发送给 AI。
- 局部调整：选择一个元素，填写修改要求，发送给 AI。
- 批量调整：连续选择多个元素，每个目标可写备注，再统一发送给 AI。
- 历史记录：查看最近的调试会话。

问题排查模式只会发送你确认过的日志。Diana 会预览最近的 `console.error`、`console.warn`、页面异常和未处理 Promise 异常；默认选择错误日志，警告日志需要你手动选择。日志可能包含 token、邮箱、订单号等敏感信息，请确认后再发送。ui-inspect 不会自动发送 cookies、localStorage、网络请求正文或截图。

CSS 调试模式不会直接修改源码。Diana 会把浏览器里的预览样式作为调试上下文发送给 AI，包含：

- `originalStyles`：选中元素进入调试前的关键样式。
- `previewStyles`：用户在浏览器中调试后的预览样式。
- `changedStyles`：用户主动改过的 CSS 属性 diff。
- `interactions` / `primaryInteraction`：用户通过面板、拖动大小或拖动位置表达的操作记录。位置拖拽默认用 `transform` 做浏览器预览，AI 应结合源码和布局判断最终落点。
- `computedEffects`：用户没有直接改、但浏览器计算后发生连带变化的样式，例如宽高变化。
- `layoutContext`：选中元素的父级、少量兄弟元素和子元素的布局上下文，用来判断是否影响网格、弹性布局或相邻内容。
- 用户备注：用户对这次样式调整的自然语言说明。
- `sourceHints`：浏览器采集到的源码候选线索。

发送后，浏览器面板会显示任务状态：`已发送`、`AI 已接收`、`处理中`、`已完成`、`失败`。

如果 AI 在 10 分钟内没有等到浏览器发送，`wait_for_frontend_request` 会超时，并关闭本次 ui-inspect daemon / MCP 进程。

## 给 AI Agent 的操作说明

如果用户把这个仓库或 README 发给你，并希望你帮他接入 ui-inspect，请按这个流程执行：

1. 先识别用户项目类型，优先查看 `package.json`、`vite.config.*`、`next.config.*`、`webpack.config.*`、`rspack.config.*`、`rsbuild.config.*`。
2. 如果是 Vite 项目，安装 `@ui-inspect/vite-plugin@latest`，在 Vite 配置中引入并加入 `uiInspect()`；AI 可以自动或半自动 patch 配置。
3. 如果是 Next.js 项目，安装 `@ui-inspect/next@latest`，加入 `UiInspectScript`，并按 App Router 或 Pages Router 添加 Diana API route：App Router 导出 `GET`，Pages Router 导出 `dianaHandler as default`。
4. 如果是 Webpack、Rspack 或 Rsbuild 项目，安装对应插件包，并提示用户把 `uiInspect()` 或 `pluginUiInspect()` 加到项目插件配置中；这类项目通常需要结合现有配置形态接入。
5. 指导用户在 MCP client 中配置 `@ui-inspect/cli@latest mcp`。
6. 当用户说 `启用 ui-inspect` 时，不要搜索业务功能，直接调用 `start_ui_inspect`。
7. 根据 `start_ui_inspect` 返回的项目识别结果、接入状态和下一步提示，确认用户是否还需要补充插件、组件或 API route。
8. 提醒用户自己启动前端项目，并打开要检查的页面。
9. 立即调用 `wait_for_frontend_request`。
10. 收到任务后，读取 `selection`、`targets`、`targetSources`、`session` 和用户备注。
11. 如果是批量任务，逐项处理 `targets` 和 `targetSources`，不要只改第一个目标。
12. 如果是问题排查任务，先阅读 `diagnostics`、`runtimeSummary` 和 `sourceHints`，再定位和修改。
13. 如果是 CSS 调试任务，先阅读 `changedStyles`、`primaryInteraction`、`interactions`、`computedEffects`、`layoutContext`、`originalStyles`、`previewStyles` 和用户备注，再结合 `sourceHints` 找到源码位置；`changedStyles` 表示用户主动想要的改动，`primaryInteraction` / `interactions` 表示用户是通过面板、拖动大小还是拖动位置表达意图；`computedEffects` 和 `layoutContext` 只用于判断连带影响；优先修改项目源码里的 CSS、组件样式或 class，不要直接照搬浏览器预览 inline style。特别是位置拖拽的 `transform` 通常只是预览表达，应结合父级布局判断最终应落到 `margin`、`gap`、`align-*`、`justify-*`、grid/flex 配置或保留 `transform`。
14. 开始修改前调用 `update_ui_task_status` 设置为 `working`。
15. 修改完成后调用 `update_ui_task_status` 设置为 `done`，再用 `reply_to_user` 把简短结果回写到浏览器面板。

固定触发语是：

```text
启用 ui-inspect
```

## MCP Tools

### `start_ui_inspect`

启动或检查 ui-inspect 工作流。

它会：

- 启动或复用本地 daemon。
- 检测当前项目类型和可用接入方式。
- 返回 daemon 状态、项目识别结果、接入状态和建议下一步。

对 Next.js 项目，返回结果中的 `integration` 预期包含：

- `projectType`: `next`。
- `router`: `app`、`pages`、`both` 或 `unknown`。
- `missing`: 缺失的接入项，例如 `@ui-inspect/next`、`UiInspectScript`、`diana-route`。
- `nextSteps`: 当前项目需要执行的接入步骤。
- `snippets`: 如果当前 CLI 版本支持，会给出可直接参考的 App Router 或 Pages Router 代码片段。

Next 接入完成后，`missing` 应为空，`nextSteps` 会提示继续使用自己的 Next dev server，打开目标页面后在浏览器中选择元素并发送。

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
- CSS 调试上下文，包括 `originalStyles`、`previewStyles`、`changedStyles`、`primaryInteraction`、`interactions`、`computedEffects`、`layoutContext`、用户备注和 `sourceHints`

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

- 集成入口：Vite、Next.js、Webpack、Rspack、Rsbuild 分别通过插件、组件或 API route 接入。
- Browser Adapter：抽象 Vue、React、Vanilla DOM 等框架差异，生成组件和源码线索。
- Browser UI：Diana、菜单、面板、toast、样式等浏览器端 UI 模块。
- 浏览器运行层：负责点选元素、确认源码线索、CSS 调试预览、批量调整、输入需求、查看历史和展示任务状态。
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

- 当前页面是否来自已接入 ui-inspect 的 dev server。
- Vite / Webpack / Rspack 项目是否在构建配置中加入了 `uiInspect()`。
- Rsbuild 项目是否在配置中加入了 `pluginUiInspect()`。
- Next.js 项目是否加入了 `UiInspectScript`，并添加了对应的 Diana API route。
- 安装插件或新增接入文件后是否重启了 dev server。

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

### 维护者验收：Next smoke

Next 项目识别和接入提示应通过两个示例项目做真实 MCP 流程验收：

1. 在 `examples/next-app-router` 中启动 MCP，并调用 `start_ui_inspect`。
2. 确认返回的 `integration.projectType` 为 `next`，`integration.router` 为 `app`。
3. 确认 `integration.missing` 为空；如果示例被故意改成未接入状态，应准确提示缺少 `@ui-inspect/next`、`UiInspectScript` 或 `diana-route`。
4. 确认 App Router 的接入说明保持为 `UiInspectScript` 加 `GET`。
5. 在 `examples/next-pages-router` 中重复验收，确认 `integration.router` 为 `pages`。
6. 确认 Pages Router 的接入说明保持为 `UiInspectScript` 加 `dianaHandler`。
7. 如果返回包含 `snippets`，确认片段与 README 中公开 API 一致。

文档和公开 API 的基础校验：

```bash
pnpm check:public-docs
```

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
