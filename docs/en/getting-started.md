# Getting Started

This guide explains how to connect ui-inspect to your MCP client and frontend project.

## 1. Configure MCP

JSON config:

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

TOML config:

```toml
[mcp_servers.ui-inspect]
type = "stdio"
command = "npx"
args = ["-y", "@ui-inspect/cli@latest", "mcp"]
```

You can also install the CLI globally:

```bash
npm install -g @ui-inspect/cli@latest
```

Then configure:

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

## 2. Integrate Your Frontend Project

ui-inspect does not start your application dev server for you. Add the matching integration first, then run your normal `npm run dev`, `pnpm dev`, or `yarn dev` command.

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

If your project already has plugins, add `uiInspect()` to the existing `plugins` array.

### Next.js

```bash
npm install -D @ui-inspect/next@latest
```

App Router: add `UiInspectScript` to `app/layout.tsx`.

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

Then add `app/api/ui-inspect/diana/route.ts`:

```ts
export { GET } from '@ui-inspect/next/app';
```

Pages Router: add `UiInspectScript` to `pages/_app.tsx`.

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

Then add `pages/api/ui-inspect/diana.ts`:

```ts
export { dianaHandler as default } from '@ui-inspect/next/pages';
```

The Next.js integration uses a React component plus an API route instead of relying only on `next.config.js`, so it can work in both Webpack dev and Turbopack dev.

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

## 3. Start and Use

Start your application:

```bash
npm run dev
```

Or:

```bash
pnpm dev
yarn dev
```

Open the page, then tell your AI coding agent:

```text
start ui-inspect
```

You can also say `enable ui-inspect`, `use ui-inspect`, `launch ui-inspect`, `turn on ui-inspect`, or `启用 ui-inspect`. The agent should call `start_ui_inspect`, then `wait_for_frontend_request`. You can then use Diana in the browser to select elements and send requests.

## Diana Features

- Source hints: select an element and confirm component names, file paths, and source candidates.
- Create AI Task: select one element, describe the change, and send it to AI.
- Batch Task: select multiple elements, add notes per target, and send one task.
- Debug: select a component and confirm console diagnostics before sending.
- Task Records: view recent browser-to-agent tasks.

Diagnostics are shown for confirmation before sending. ui-inspect does not automatically send cookies, localStorage, request bodies, or screenshots.
