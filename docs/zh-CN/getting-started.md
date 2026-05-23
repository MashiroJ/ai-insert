# 快速开始

这份文档介绍如何把 ui-inspect 接入你的 MCP client 和前端项目。

## 1. 配置 MCP

JSON 配置：

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

TOML 配置：

```toml
[mcp_servers.ui-inspect]
type = "stdio"
command = "npx"
args = ["-y", "@ui-inspect/cli@latest", "mcp"]
```

也可以全局安装：

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

## 2. 接入前端项目

ui-inspect 不会替你启动业务项目。你需要先在项目里接入对应插件或组件，再用原本的 `npm run dev`、`pnpm dev` 或 `yarn dev` 启动页面。

### Vite

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

如果项目已有插件，把 `uiInspect()` 放进现有 `plugins` 数组即可。

### Next.js

```bash
npm install -D @ui-inspect/next@latest
```

App Router：在 `app/layout.tsx` 中加入 `UiInspectScript`。

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

再添加 `app/api/ui-inspect/diana/route.ts`：

```ts
export { GET } from '@ui-inspect/next/app';
```

Pages Router：在 `pages/_app.tsx` 中加入 `UiInspectScript`。

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

再添加 `pages/api/ui-inspect/diana.ts`：

```ts
export { dianaHandler as default } from '@ui-inspect/next/pages';
```

Next.js 采用组件式接入，而不是只依赖 `next.config.js` 注入，这样可以同时覆盖 Webpack dev 和 Turbopack dev。

### Webpack

```bash
npm install -D @ui-inspect/webpack-plugin@latest
```

```ts
import { uiInspect } from '@ui-inspect/webpack-plugin';

export default {
  plugins: [
    uiInspect(),
  ],
};
```

### Rspack

```bash
npm install -D @ui-inspect/rspack-plugin@latest
```

```ts
import { defineConfig } from '@rspack/cli';
import { uiInspect } from '@ui-inspect/rspack-plugin';

export default defineConfig({
  plugins: [
    uiInspect(),
  ],
});
```

### Rsbuild

```bash
npm install -D @ui-inspect/rsbuild-plugin@latest
```

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginUiInspect } from '@ui-inspect/rsbuild-plugin';

export default defineConfig({
  plugins: [
    pluginUiInspect(),
  ],
});
```

## 3. 启动并使用

启动你的业务项目：

```bash
npm run dev
```

或：

```bash
pnpm dev
yarn dev
```

打开页面后，在 AI coding agent 对话中输入：

```text
启用 ui-inspect
```

你也可以说 `使用 ui-inspect`、`调用 ui-inspect`、`启动 ui-inspect`、`打开 UI 检查` 或 `start ui-inspect`。agent 应调用 `start_ui_inspect`，再调用 `wait_for_frontend_request` 等待浏览器任务。然后你就可以在页面中通过 Diana 选择元素并发送需求。

## Diana 功能

- 源码线索：点选元素后确认组件名、文件路径和源码候选。
- 局部调整：选择一个元素，填写修改要求，发送给 AI。
- 批量调整：连续选择多个元素，每个目标可写备注，再统一发送。
- 问题排查：选择组件并确认 console 日志，再发送给 AI。
- CSS 调试：在浏览器中预览调整样式、拖拽位置或尺寸，再发送样式 diff。
- 历史记录：查看最近的调试会话。

诊断日志会先展示给用户确认。ui-inspect 不会自动发送 cookies、localStorage、网络请求正文或截图。
