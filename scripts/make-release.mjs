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

## 本地 tgz 安装

如果你需要使用当前 release 目录里的 tgz 包：

\`\`\`bash
npm install -g ./ui-inspect-protocol-${version}.tgz ./ui-inspect-server-${version}.tgz ./ui-inspect-cli-${version}.tgz
npm install -D ./ui-inspect-protocol-${version}.tgz ./ui-inspect-vite-plugin-${version}.tgz
\`\`\`

第一条命令用于安装 MCP CLI；第二条命令需要在目标 Vite 项目目录里执行。

## 使用

在 AI coding agent 对话里输入：

\`\`\`text
启用 ui-inspect
\`\`\`

agent 应调用 \`start_ui_inspect\`，再调用 \`wait_for_frontend_request\` 等待用户在浏览器面板里选择元素并点击发送。

\`start_ui_inspect\` 只启动/复用 ui-inspect daemon 并检查 Vite 插件接入，不会启动用户项目 dev server，也不会打开浏览器。用户需要用项目自己的命令启动目标前端系统。

## ${version} 能力

- Diana 作为默认悬浮入口，替代原来的文字按钮。
- Diana 的 9 组素材动作已映射到待机、移动、扫描、写入、休息、失败、待命、执行和读取数据状态。
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
