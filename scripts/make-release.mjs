import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = '0.2.0';
const outDir = join(root, 'release', `ai-inspect-${version}`);
const packages = [
  '@mashiro39/ai-inspect-protocol',
  '@mashiro39/ai-inspect-server',
  '@mashiro39/ai-inspect-cli',
  '@mashiro39/ai-inspect-vite-plugin',
];

run('pnpm', ['build'], root);
await rm(join(root, 'release'), { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const pkg of packages) {
  run('pnpm', ['--filter', pkg, 'pack', '--pack-destination', outDir], root);
}

await writeFile(join(outDir, 'install.sh'), installSh(), { mode: 0o755 });
await writeFile(join(outDir, 'install.ps1'), installPs1());
await writeFile(join(outDir, 'configure-mcp.mjs'), configureMcp());
await writeFile(join(outDir, 'patch-vite-config.mjs'), patchViteConfig());
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

function installSh() {
  return `#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR=""
MODE=""
SOURCE="npm"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_DIR="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --source)
      SOURCE="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'HELP'
用法: ./install.sh [--mode mcp|vite|all] [--source npm|local] [--project /path/to/vite-project]

模式:
  mcp   安装 MCP 命令并输出通用 MCP 配置片段
  vite  给某个 Vue/Vite 项目安装网页调试插件
  all   配置 MCP，并安装 Vue/Vite 插件

示例:
  ./install.sh
  ./install.sh --mode mcp
  ./install.sh --mode vite --project /path/to/vite-vue-project
  ./install.sh --source local --mode all --project /path/to/vite-vue-project
HELP
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if ! command -v npm >/dev/null 2>&1; then
  echo "缺少 npm。请先安装 Node.js。" >&2
  exit 1
fi

if [[ "$SOURCE" != "npm" && "$SOURCE" != "local" ]]; then
  echo "未知安装来源: $SOURCE。可选值：npm 或 local。" >&2
  exit 2
fi

if [[ -z "$MODE" ]]; then
  echo "请选择要安装/配置的内容："
  echo "  1) 配置 MCP：安装命令并输出通用 MCP 配置片段"
      echo "  2) 安装 Vue/Vite 插件：让目标网页出现右下角「AI 调试」按钮和调试面板"
  echo "  3) 全部安装：MCP + Vue/Vite 插件"
  read -r -p "请输入选项 [1/2/3]（默认 1）: " choice
  case "$choice" in
    2) MODE="vite" ;;
    3) MODE="all" ;;
    *) MODE="mcp" ;;
  esac
fi

install_mcp_command() {
  echo "正在安装 ai-inspect MCP 命令..."
  if [[ "$SOURCE" == "local" ]]; then
    npm install -g --force "$DIR"/mashiro39-ai-inspect-protocol-${version}.tgz "$DIR"/mashiro39-ai-inspect-server-${version}.tgz "$DIR"/mashiro39-ai-inspect-vite-plugin-${version}.tgz "$DIR"/mashiro39-ai-inspect-cli-${version}.tgz
  else
    npm install -g --force @mashiro39/ai-inspect-cli@${version}
  fi
}

configure_mcp() {
  install_mcp_command
  echo "正在输出通用 MCP 配置..."
  node "$DIR/configure-mcp.mjs"
}

install_vite_plugin() {
  if [[ -z "$PROJECT_DIR" ]]; then
    read -r -p "请输入 Vue/Vite 项目路径（包含 package.json）: " PROJECT_DIR
  fi
  if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
    echo "未找到项目 package.json: $PROJECT_DIR" >&2
    exit 1
  fi
  echo "正在给项目安装 Vue/Vite 调试插件: $PROJECT_DIR"
  package_manager="$(detect_project_package_manager "$PROJECT_DIR")"
  echo "项目包管理器: $package_manager"
  if [[ "$package_manager" == "pnpm" ]]; then
    if [[ "$SOURCE" == "local" ]]; then
      (cd "$PROJECT_DIR" && pnpm add -D "$DIR"/mashiro39-ai-inspect-protocol-${version}.tgz "$DIR"/mashiro39-ai-inspect-vite-plugin-${version}.tgz)
    else
      (cd "$PROJECT_DIR" && pnpm add -D @mashiro39/ai-inspect-vite-plugin@${version})
    fi
  elif [[ "$package_manager" == "yarn" ]]; then
    if [[ "$SOURCE" == "local" ]]; then
      (cd "$PROJECT_DIR" && COREPACK_ENABLE_STRICT=0 yarn add -D "$DIR"/mashiro39-ai-inspect-protocol-${version}.tgz "$DIR"/mashiro39-ai-inspect-vite-plugin-${version}.tgz)
    else
      (cd "$PROJECT_DIR" && COREPACK_ENABLE_STRICT=0 yarn add -D @mashiro39/ai-inspect-vite-plugin@${version} --registry https://registry.npmjs.org)
    fi
  else
    if [[ "$SOURCE" == "local" ]]; then
      npm install --save-dev --prefix "$PROJECT_DIR" "$DIR"/mashiro39-ai-inspect-protocol-${version}.tgz "$DIR"/mashiro39-ai-inspect-vite-plugin-${version}.tgz
    else
      npm install --save-dev --prefix "$PROJECT_DIR" @mashiro39/ai-inspect-vite-plugin@${version}
    fi
  fi
  node "$DIR/patch-vite-config.mjs" --project "$PROJECT_DIR"
}

detect_project_package_manager() {
  local project="$1"
  local package_manager
  package_manager="$(node -e "const fs=require('fs');const pkg=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(pkg.packageManager||'')" "$project/package.json")"
  if [[ "$package_manager" == yarn@* ]]; then echo "yarn"; return; fi
  if [[ -f "$project/yarn.lock" ]]; then echo "yarn"; return; fi
  if [[ "$package_manager" == pnpm@* ]]; then echo "pnpm"; return; fi
  if [[ "$package_manager" == npm@* ]]; then echo "npm"; return; fi
  if [[ -f "$project/pnpm-lock.yaml" ]]; then echo "pnpm"; return; fi
  if command -v yarn >/dev/null 2>&1; then echo "yarn"; return; fi
  echo "npm"
}

case "$MODE" in
  mcp)
    configure_mcp
    ;;
  vite)
    install_vite_plugin
    ;;
  all)
    configure_mcp
    install_vite_plugin
    ;;
  *)
    echo "未知模式: $MODE" >&2
    exit 2
    ;;
esac

echo "安装完成。"
echo "MCP 启动命令: ai-inspect mcp"
echo "请把上面的 MCP 配置片段添加到你使用的 agent/client。"
`;
}

function installPs1() {
  return `param(
  [ValidateSet("", "mcp", "vite", "all")]
  [string]$Mode = "",
  [ValidateSet("npm", "local")]
  [string]$Source = "npm",
  [string]$Project = ""
)

$ErrorActionPreference = "Stop"
$Dir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "缺少 npm。请先安装 Node.js。"
}

if ($Mode -eq "") {
  Write-Host "请选择要安装/配置的内容："
  Write-Host "  1) 配置 MCP：安装命令并输出通用 MCP 配置片段"
  Write-Host "  2) 安装 Vue/Vite 插件：让目标网页出现右下角「AI 调试」按钮和调试面板"
  Write-Host "  3) 全部安装：MCP + Vue/Vite 插件"
  $choice = Read-Host "请输入选项 [1/2/3]（默认 1）"
  if ($choice -eq "2") { $Mode = "vite" }
  elseif ($choice -eq "3") { $Mode = "all" }
  else { $Mode = "mcp" }
}

function Install-McpCommand {
  Write-Host "正在安装 ai-inspect MCP 命令..."
  if ($Source -eq "local") {
    npm install -g --force "$Dir\\mashiro39-ai-inspect-protocol-${version}.tgz" "$Dir\\mashiro39-ai-inspect-server-${version}.tgz" "$Dir\\mashiro39-ai-inspect-vite-plugin-${version}.tgz" "$Dir\\mashiro39-ai-inspect-cli-${version}.tgz"
  } else {
    npm install -g --force "@mashiro39/ai-inspect-cli@${version}"
  }
}

function Configure-Mcp {
  Install-McpCommand
  Write-Host "正在输出通用 MCP 配置..."
  node "$Dir\\configure-mcp.mjs"
}

function Install-VitePlugin {
  if ($Project -eq "") {
    $script:Project = Read-Host "请输入 Vue/Vite 项目路径（包含 package.json）"
  }
  if (-not (Test-Path (Join-Path $Project "package.json"))) {
    throw "未找到项目 package.json: $Project"
  }
  Write-Host "正在给项目安装 Vue/Vite 调试插件: $Project"
  $packageManager = Get-ProjectPackageManager $Project
  Write-Host "项目包管理器: $packageManager"
  if ($packageManager -eq "pnpm") {
    Push-Location $Project
    if ($Source -eq "local") {
      pnpm add -D "$Dir\\mashiro39-ai-inspect-protocol-${version}.tgz" "$Dir\\mashiro39-ai-inspect-vite-plugin-${version}.tgz"
    } else {
      pnpm add -D "@mashiro39/ai-inspect-vite-plugin@${version}"
    }
    Pop-Location
  } elseif ($packageManager -eq "yarn") {
    Push-Location $Project
    if ($Source -eq "local") {
      $env:COREPACK_ENABLE_STRICT = "0"
      yarn add -D "$Dir\\mashiro39-ai-inspect-protocol-${version}.tgz" "$Dir\\mashiro39-ai-inspect-vite-plugin-${version}.tgz"
    } else {
      $env:COREPACK_ENABLE_STRICT = "0"
      yarn add -D "@mashiro39/ai-inspect-vite-plugin@${version}" --registry "https://registry.npmjs.org"
    }
    Pop-Location
  } else {
    if ($Source -eq "local") {
      npm install --save-dev --prefix "$Project" "$Dir\\mashiro39-ai-inspect-protocol-${version}.tgz" "$Dir\\mashiro39-ai-inspect-vite-plugin-${version}.tgz"
    } else {
      npm install --save-dev --prefix "$Project" "@mashiro39/ai-inspect-vite-plugin@${version}"
    }
  }
  node "$Dir\\patch-vite-config.mjs" --project "$Project"
}

function Get-ProjectPackageManager {
  param([string]$ProjectPath)
  $packageJson = Get-Content (Join-Path $ProjectPath "package.json") -Raw | ConvertFrom-Json
  $packageManager = if ($packageJson.packageManager) { [string]$packageJson.packageManager } else { "" }
  if ($packageManager.StartsWith("yarn@")) { return "yarn" }
  if (Test-Path (Join-Path $ProjectPath "yarn.lock")) { return "yarn" }
  if ($packageManager.StartsWith("pnpm@")) { return "pnpm" }
  if ($packageManager.StartsWith("npm@")) { return "npm" }
  if (Test-Path (Join-Path $ProjectPath "pnpm-lock.yaml")) { return "pnpm" }
  if (Get-Command yarn -ErrorAction SilentlyContinue) { return "yarn" }
  return "npm"
}

switch ($Mode) {
  "mcp" { Configure-Mcp }
  "vite" { Install-VitePlugin }
  "all" { Configure-Mcp; Install-VitePlugin }
  default { throw "未知模式: $Mode" }
}

Write-Host "安装完成。"
Write-Host "MCP 启动命令: ai-inspect mcp"
Write-Host "请把上面的 MCP 配置片段添加到你使用的 agent/client。"
`;
}

function configureMcp() {
  return `import process from 'node:process';
import { spawnSync } from 'node:child_process';

printSnippets();

function printSnippets() {
  const command = resolveAiInspectCommand();
  console.log('ai-inspect 是通用 MCP 服务。请把以下任一配置片段添加到你的 MCP client/agent。');
  console.log('\\nTOML:');
  console.log('[mcp_servers.ai-inspect]\\ntype = "stdio"\\ncommand = "' + escapeToml(command) + '"\\nargs = ["mcp"]');
  console.log('\\nJSON:');
  printJsonSnippet();
}

function printJsonSnippet() {
  const command = resolveAiInspectCommand();
  console.log(JSON.stringify({
    mcpServers: {
      'ai-inspect': {
        command,
        args: ['mcp'],
      },
    },
  }, null, 2));
}

function resolveAiInspectCommand() {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ai-inspect'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const first = result.stdout.split(/\\r?\\n/).map((line) => line.trim()).find(Boolean);
  return first || 'ai-inspect';
}

function escapeToml(value) {
  return value.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
}
`;
}

function patchViteConfig() {
  return `import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const project = valueAfter('--project') || process.cwd();
const candidates = [
  'vite.config.ts',
  'vite.config.mts',
  'vite.config.js',
  'vite.config.mjs',
];
const configFile = candidates.map((name) => join(project, name)).find((file) => existsSync(file));

if (!configFile) {
  console.log('未找到 vite.config 文件。请手动添加：');
  printManualSnippet();
  process.exit(0);
}

let content = readFileSync(configFile, 'utf8');
content = content.replace(/^import\\s+\\{\\s*aiInspect\\s*\\}\\s+from\\s+['"]@ai-inspect\\/vite-plugin['"];\\s*\\n?/gm, '');
if (content.includes('@mashiro39/ai-inspect-vite-plugin') && /\\baiInspect\\s*\\(/.test(content)) {
  console.log('Vite 配置已包含 aiInspect(): ' + configFile);
  process.exit(0);
}

if (!content.includes('@mashiro39/ai-inspect-vite-plugin')) {
  const importLine = "import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';\\n";
  const importMatches = [...content.matchAll(/^import\\s.+?;\\s*$/gm)];
  if (importMatches.length > 0) {
    const last = importMatches[importMatches.length - 1];
    const insertAt = (last.index || 0) + last[0].length;
    content = content.slice(0, insertAt) + '\\n' + importLine.trimEnd() + content.slice(insertAt);
  } else {
    content = importLine + content;
  }
}

if (!/\\baiInspect\\s*\\(/.test(content)) {
  const pluginsMatch = content.match(/plugins\\s*:\\s*\\[/);
  if (!pluginsMatch || pluginsMatch.index === undefined) {
    console.log('已安装依赖，但未能自动找到 plugins 数组。请手动添加：');
    writeFileSync(configFile, content);
    printManualSnippet();
    process.exit(0);
  }
  const insertAt = pluginsMatch.index + pluginsMatch[0].length;
  content = content.slice(0, insertAt) + 'aiInspect(), ' + content.slice(insertAt);
}

writeFileSync(configFile, content);
console.log('已自动接入 Vite 插件: ' + configFile);
console.log('启动项目后，页面右下角应出现「AI 调试」按钮。');

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function printManualSnippet() {
  console.log("\\nimport { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';\\n\\nexport default defineConfig({\\n  plugins: [vue(), aiInspect()],\\n});\\n");
}
`;
}

function readme() {
  return `# ai-inspect 本地安装包

这个目录用于安装 ai-inspect：一个通用 MCP 前端检查上下文服务。

版本：${version}

包含：

- MCP 命令：\`ai-inspect mcp\`
- Vue/Vite 项目插件：右下角 \`AI 调试\` 按钮、调试面板、元素选择、高亮、历史会话
- 本地 daemon：保存 selection 和 session，供任意 MCP agent 读取

## 安装

\`\`\`bash
./install.sh
\`\`\`

\`\`\`bash
./install.sh --mode mcp
./install.sh --mode vite --project /path/to/vite-vue-project
./install.sh --mode all --project /path/to/vite-vue-project
./install.sh --source local --mode all --project /path/to/vite-vue-project
\`\`\`

Windows PowerShell：

\`\`\`powershell
Set-ExecutionPolicy -Scope Process Bypass
.\\install.ps1
.\\install.ps1 -Mode mcp
.\\install.ps1 -Mode vite -Project "C:\\path\\to\\vite-vue-project"
.\\install.ps1 -Mode all -Project "C:\\path\\to\\vite-vue-project"
\`\`\`

默认使用公网 npm 安装；只有显式传入 \`--source local\` 时才使用当前目录内的 tgz 包。

## MCP 配置

\`./install.sh --mode mcp\` 和 \`.\\install.ps1 -Mode mcp\` 会安装 \`ai-inspect\` 命令，并输出通用 MCP 配置片段。把其中一个片段添加到你使用的 MCP client/agent：

\`\`\`json
{
  "mcpServers": {
    "ai-inspect": {
      "command": "ai-inspect",
      "args": ["mcp"]
    }
  }
}
\`\`\`

\`\`\`toml
[mcp_servers.ai-inspect]
type = "stdio"
command = "ai-inspect"
args = ["mcp"]
\`\`\`

## Vite 配置

安装脚本会尝试自动修改 \`vite.config.ts/js/mts/mjs\`。如果自动修改失败，请手动添加：

\`\`\`ts
import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';

export default defineConfig({
  plugins: [vue(), aiInspect()],
});
\`\`\`

## 运行

正常使用时只需要启动你的业务前端项目，例如 \`yarn dev\` / \`pnpm dev\` / \`npm run dev\`。

固定触发语：

\`\`\`text
启用 ai-insert
\`\`\`

任意 MCP agent 看到这句话时，应调用 \`start_ai_inspect\`。该工具会静默启动本地 daemon，自动检查/补接入 \`@mashiro39/ai-inspect-vite-plugin\`，启动或复用项目 dev server，并返回检测到的 URL；它不会打开浏览器，也不会启动任何特定 agent。

浏览器面板交互：

- 点击右下角 \`AI 调试\` 先打开面板，不会立刻进入框选。
- 点击 \`选择\` 后进入元素框选，选中后保留高亮并回到面板。
- 点击 \`发送\` 后，面板只会把最新选择和输入内容记录到 daemon session；由当前 MCP agent 读取并决定如何处理。
- \`Enter\` 发送，\`Shift+Enter\` 换行，\`Esc\` 关闭面板。

运行时状态默认写入当前业务项目的 \`.ai-insert/\` 目录。历史会话会保存到 \`.ai-insert/sessions.json\`；Vite 插件会忽略该目录，写入历史不会触发页面刷新。

## 工作原理

ai-inspect 分成四层：

- Vite 插件：只在 dev server 中注入浏览器脚本。
- 浏览器面板：负责元素选择、输入指令、历史会话和删除历史。
- 本地 daemon：运行在 \`http://127.0.0.1:17321\`，保存最新选择和会话历史。
- MCP server：通过标准 MCP tools 向任意 agent 暴露结构化前端上下文。

浏览器不会直接改代码。它会把以下结构化信息 POST 给 daemon：

- 页面 URL 和标题
- CSS selector、DOM 快照、元素尺寸、计算样式
- Vue 组件名、组件链、props、attrs、\`__file\` 源码提示
- 用户输入的调整指令
- 当前 session id

daemon 会把会话保存到当前业务项目：

\`\`\`text
<target-project>/.ai-insert/sessions.json
\`\`\`

普通新选择会创建新 session；从 \`历史\` 进入的会话会复用旧 session。如果在历史会话里重新点击 \`选择\`，最新框选会替换该会话的当前选择。

MCP 工具：

- \`start_ai_inspect\`
- \`get_frontend_selection\`
- \`get_frontend_source\`
- \`get_frontend_sessions\`
- \`reply_to_user\`

## 发布到 npm

公网 npm 发布使用个人 scope \`@mashiro39\`。MCP 命令仍然叫 \`ai-inspect mcp\`。

\`\`\`bash
npm login --registry https://registry.npmjs.org
npm whoami --registry https://registry.npmjs.org
pnpm install
pnpm run publish:npm:dry-run
pnpm run publish:npm
\`\`\`

发布脚本会自动执行 typecheck、生成本地 release 包、按依赖顺序发布 npm 包，并在发布后验证 registry 版本。

发布后用户可以：

\`\`\`bash
npm install -g @mashiro39/ai-inspect-cli
npm install -D @mashiro39/ai-inspect-vite-plugin
\`\`\`
`;
}
