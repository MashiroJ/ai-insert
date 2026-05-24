import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
const outDir = join(root, 'release', `ui-inspect-${version}`);
const packages = [
  '@ui-inspect/protocol',
  '@ui-inspect/shared',
  '@ui-inspect/browser-adapter',
  '@ui-inspect/browser-ui',
  '@ui-inspect/server',
  '@ui-inspect/vite-plugin',
  '@ui-inspect/webpack-plugin',
  '@ui-inspect/rspack-plugin',
  '@ui-inspect/rsbuild-plugin',
  '@ui-inspect/next',
  '@ui-inspect/cli',
];

run('pnpm', ['build'], root);
await rm(join(root, 'release'), { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const pkg of packages) {
  run('pnpm', ['--filter', pkg, 'pack', '--pack-destination', outDir], root);
}

await writeFile(join(outDir, 'README.md'), readme());

const files = (await readdir(outDir)).sort();
console.log(`Release bundle written to ${outDir}`);
for (const file of files) console.log(`- ${file}`);

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status}`);
  }
}

function readme() {
  return `# ui-inspect release ${version}

ui-inspect 是一个通用 MCP 前端检查上下文服务。

这个目录只包含 npm tgz 包和说明文档，不再提供内部安装脚本。普通用户推荐直接从 npm 安装最新版；只有离线、本地验证或发布检查时，才需要使用这里的 tgz 包。

## 推荐安装方式

### MCP client 配置

推荐使用 npm 最新版：

\`\`\`json
{
  "mcpServers": {
    "ui-inspect": {
      "command": "npx",
      "args": ["-y", "@ui-inspect/cli@latest", "mcp"]
    }
  }
}
\`\`\`

TOML：

\`\`\`toml
[mcp_servers.ui-inspect]
type = "stdio"
command = "npx"
args = ["-y", "@ui-inspect/cli@latest", "mcp"]
\`\`\`

也可以全局安装：

\`\`\`bash
npm install -g @ui-inspect/cli@latest
\`\`\`

然后配置：

\`\`\`json
{
  "mcpServers": {
    "ui-inspect": {
      "command": "ui-inspect",
      "args": ["mcp"]
    }
  }
}
\`\`\`

### Vite / Vue 项目接入

\`\`\`bash
npm install -D @ui-inspect/vite-plugin@latest
\`\`\`

\`\`\`ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { uiInspect } from '@ui-inspect/vite-plugin';

export default defineConfig({
  plugins: [vue(), uiInspect()],
});
\`\`\`

### Rspack 项目接入

\`\`\`bash
npm install -D @ui-inspect/rspack-plugin@latest
\`\`\`

\`\`\`ts
import { defineConfig } from '@rspack/cli';
import { uiInspect } from '@ui-inspect/rspack-plugin';

export default defineConfig({
  plugins: [uiInspect()],
});
\`\`\`

### Rsbuild 项目接入

\`\`\`bash
npm install -D @ui-inspect/rsbuild-plugin@latest
\`\`\`

\`\`\`ts
import { defineConfig } from '@rsbuild/core';
import { pluginUiInspect } from '@ui-inspect/rsbuild-plugin';

export default defineConfig({
  plugins: [pluginUiInspect()],
});
\`\`\`

### Next.js 项目接入

\`\`\`bash
npm install -D @ui-inspect/next@latest
\`\`\`

App Router 在 \`app/layout.tsx\` 中加入：

\`\`\`tsx
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
\`\`\`

并添加 \`app/api/ui-inspect/diana/route.ts\`：

\`\`\`ts
export { GET } from '@ui-inspect/next/app';
\`\`\`

## 本地 tgz 安装

如果你需要使用当前 release 目录里的 tgz 包：

\`\`\`bash
npm install -g ./ui-inspect-protocol-${version}.tgz ./ui-inspect-server-${version}.tgz ./ui-inspect-cli-${version}.tgz
npm install -D ./ui-inspect-protocol-${version}.tgz ./ui-inspect-vite-plugin-${version}.tgz
npm install -D ./ui-inspect-rspack-plugin-${version}.tgz
npm install -D ./ui-inspect-rsbuild-plugin-${version}.tgz
npm install -D ./ui-inspect-next-${version}.tgz
\`\`\`

第一条命令用于安装 MCP CLI；后面的命令按目标项目构建工具选择执行。

## 使用

在 AI coding agent 对话里输入：

\`\`\`text
启用 ui-inspect
\`\`\`

也可以说 \`使用 ui-inspect\`、\`调用 ui-inspect\`、\`启动 ui-inspect\`、\`打开 UI 检查\`、\`start ui-inspect\` 或 \`enable ui-inspect\`。agent 应调用 \`start_ui_inspect\`，再调用 \`wait_for_frontend_request\` 等待用户在浏览器面板里选择元素并点击发送。

\`start_ui_inspect\` 只启动/复用 ui-inspect daemon 并检查 Vite 插件接入，不会启动用户项目 dev server，也不会打开浏览器。用户需要用项目自己的命令启动目标前端系统。

## ${version} 能力

- MCP 支持 \`complete_frontend_request\`，agent 完成当前浏览器任务后可自动进入下一轮等待。
- \`wait_for_frontend_request\` 和 \`complete_frontend_request\` 默认返回 compact 响应，减少大型源码内容对 MCP host 的压力。
- Cursor 等 MCP host 会优先从工作区环境变量识别项目根目录，减少错误 patch 到 CLI 启动目录的概率。
- CSS 调试支持 8 方向 resize：nw、n、ne、w、e、sw、s、se。
- CSS 调试支持拖拽移动、左/上方向 resize 位移补偿、盒模型可视化和键盘微调。
- 键盘微调支持 Shift+Arrow 调 margin、Alt+Arrow 调 padding、Shift+Alt+Arrow 调字体大小或字间距。
- CSS diff 会采集 margin/padding 的方向属性和 letter-spacing，发送 payload 时不会漏掉键盘微调。
- CSS 调试发送后会锁定预览输入，并清理键盘监听，避免任务发送后继续改动 inline style。
- server/protocol 可识别完整的 CSS debug handle 集合，并保留拖拽意图给 MCP agent。
- Diana 作为默认悬浮入口，替代原来的文字按钮。
- Diana 的 9 组素材动作已映射到待机、移动、扫描、写入、休息、失败、待命、执行和读取数据状态。
- 拖动 Diana 时会优先播放移动动作，不再被待命、扫描、读取等状态动画覆盖。
- Diana 保持固定尺寸和稳定标签，减少待机和状态切换时的闪烁感。
- 点击 Diana 可选择源码线索、问题排查、局部调整或批量调整。
- 定位源码只尝试打开源码并给出结果提示，不创建 AI task。
- 单点修改只保留一个修改需求输入框。
- 批量标注改为右侧批注侧栏：连续点击页面元素，批注卡片进入侧栏，最后创建 AI 任务。
- 问题排查会发送用户确认过的 console 日志和组件上下文。
- MCP 返回元素上下文摘要、批量目标摘要、源码候选线索和运行时日志摘要。
- 浏览器面板支持多选元素。
- 每个元素可以填写单独备注。
- 面板会显示任务状态：已发送、AI 已接收、处理中、已完成、失败。
- 支持从选中元素点击打开源码或复制源码路径。
- MCP agent 可用 \`update_ui_task_status\` 回写任务状态。
`;
}
