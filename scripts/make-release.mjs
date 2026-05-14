import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = '0.1.0';
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
AGENT="auto"
SOURCE="npm"
CLAUDE_SCOPE="user"

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
    --agent)
      AGENT="$2"
      shift 2
      ;;
    --source)
      SOURCE="$2"
      shift 2
      ;;
    --claude-scope)
      CLAUDE_SCOPE="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'HELP'
用法: ./install.sh [--mode mcp|vite|all] [--agent auto|codex|claude|none] [--source npm|local] [--claude-scope user|local|project] [--project /path/to/vite-project]

模式:
  mcp   安装 MCP 命令并配置 Codex / Claude
  vite  给某个 Vue/Vite 项目安装网页调试插件
  all   配置 MCP，并安装 Vue/Vite 插件

示例:
  ./install.sh
  ./install.sh --mode mcp --agent codex
  ./install.sh --mode mcp --agent claude
  ./install.sh --mode mcp --agent claude --claude-scope local
  ./install.sh --mode vite --project /path/to/vite-vue-project
  ./install.sh --source local --mode all --agent codex --project /path/to/vite-vue-project
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

if [[ "$CLAUDE_SCOPE" != "user" && "$CLAUDE_SCOPE" != "local" && "$CLAUDE_SCOPE" != "project" ]]; then
  echo "未知 Claude MCP scope: $CLAUDE_SCOPE。可选值：user、local、project。" >&2
  exit 2
fi

if [[ -z "$MODE" ]]; then
  echo "请选择要安装/配置的内容："
  echo "  1) 配置 MCP：接入 Codex / Claude（会自动安装 MCP 命令）"
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
  echo "正在配置 MCP..."
  node "$DIR/configure-mcp.mjs" --agent "$AGENT" --claude-scope "$CLAUDE_SCOPE"
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
echo "自动监听浏览器请求: ai-inspect watch --project /path/to/project"
echo "Codex 默认使用 HTTP/SSE 传输以避免代理环境下的 WebSocket 重连。"
`;
}

function installPs1() {
  return `param(
  [ValidateSet("", "mcp", "vite", "all")]
  [string]$Mode = "",
  [ValidateSet("auto", "codex", "claude", "none")]
  [string]$Agent = "auto",
  [ValidateSet("npm", "local")]
  [string]$Source = "npm",
  [ValidateSet("user", "local", "project")]
  [string]$ClaudeScope = "user",
  [string]$Project = ""
)

$ErrorActionPreference = "Stop"
$Dir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "缺少 npm。请先安装 Node.js。"
}

if ($Mode -eq "") {
  Write-Host "请选择要安装/配置的内容："
  Write-Host "  1) 配置 MCP：接入 Codex / Claude（会自动安装 MCP 命令）"
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
  Write-Host "正在配置 MCP..."
  node "$Dir\\configure-mcp.mjs" --agent $Agent --claude-scope $ClaudeScope
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
Write-Host "自动监听浏览器请求: ai-inspect watch --project /path/to/project"
Write-Host "Codex 默认使用 HTTP/SSE 传输以避免代理环境下的 WebSocket 重连。"
`;
}

function configureMcp() {
  return `import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import process from 'node:process';

const args = process.argv.slice(2);
const agentFlag = valueAfter('--agent') || 'auto';
const claudeScope = valueAfter('--claude-scope') || 'user';
const detected = detectAgents();
let selected = agentFlag;

if (selected === 'auto') {
  if (detected.length === 0) {
    console.log('未检测到 Codex/Claude 命令。下面输出 MCP 配置片段，请手动复制。');
    printSnippets();
    process.exit(0);
  }
  if (detected.length === 1) {
    selected = detected[0];
    console.log('检测到 ' + selected + '。');
  } else {
    selected = await askAgent(detected);
  }
}

if (selected === 'none') {
  printSnippets();
} else if (selected === 'codex') {
  configureCodex();
} else if (selected === 'claude') {
  configureClaude();
} else {
  throw new Error('Unknown agent: ' + selected);
}

function valueAfter(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function detectAgents() {
  return ['codex', 'claude'].filter((name) => commandExists(name));
}

function commandExists(command) {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
    shell: process.platform === 'win32',
    stdio: 'ignore',
  });
  return result.status === 0;
}

async function askAgent(agents) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('检测到以下 AI 客户端：');
    agents.forEach((agent, index) => console.log('  ' + (index + 1) + ') ' + agent));
    console.log('  ' + (agents.length + 1) + ') 只打印配置片段，不自动写入');
    const answer = await rl.question('请选择要接入 MCP 的客户端（默认 1）: ');
    const index = Number(answer || '1') - 1;
    return index >= 0 && index < agents.length ? agents[index] : 'none';
  } finally {
    rl.close();
  }
}

function configureCodex() {
  const path = join(homedir(), '.codex', 'config.toml');
  ensureDir(path);
  const command = resolveAiInspectCommand();
  const block = [
    '',
    '[mcp_servers.ai-inspect]',
    'type = "stdio"',
    'command = "' + escapeToml(command) + '"',
    'args = ["mcp"]',
    '',
  ].join('\\n');
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const next = upsertTomlBlock(current, 'mcp_servers.ai-inspect', block);
  writeFileSync(path, next);
  console.log('已配置 Codex MCP: ' + path);
  console.log('ai-inspect MCP command: ' + command);
}

function configureClaude() {
  if (commandExists('claude')) {
    if (!['user', 'local', 'project'].includes(claudeScope)) {
      throw new Error('Unknown Claude MCP scope: ' + claudeScope);
    }
    for (const scope of ['user', 'local', 'project']) {
      spawnSync('claude', ['mcp', 'remove', 'ai-inspect', '-s', scope], {
        stdio: 'ignore',
        shell: process.platform === 'win32',
      });
    }
    const result = spawnSync('claude', ['mcp', 'add', 'ai-inspect', '-s', claudeScope, '-e', 'AI_INSPECT_DEFAULT_AGENT=claude', '--', 'ai-inspect', 'mcp'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (result.status === 0) {
      console.log('已通过 claude mcp add 配置 Claude MCP（scope: ' + claudeScope + '）。');
      return;
    }
  }
  console.log('Claude 命令不可用或配置失败。请手动添加以下 MCP 配置：');
  printJsonSnippet();
}

function ensureDir(file) {
  mkdirSync(dirname(file), { recursive: true });
}

function printSnippets() {
  const command = resolveAiInspectCommand();
  console.log('\\nCodex (~/.codex/config.toml):');
  console.log('[mcp_servers.ai-inspect]\\ntype = "stdio"\\ncommand = "' + escapeToml(command) + '"\\nargs = ["mcp"]');
  console.log('\\nClaude JSON:');
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

function upsertTomlBlock(current, tableName, block) {
  const lines = current.split(/\\r?\\n/);
  const header = '[' + tableName + ']';
  const start = lines.findIndex((line) => line.trim() === header);
  if (start < 0) return current.trimEnd() + block;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\\s*\\[.+\\]\\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const replacement = block.trim().split('\\n');
  const next = [...lines.slice(0, start), ...replacement, ...lines.slice(end)];
  return next.join('\\n').replace(/\\n*$/, '\\n');
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

这个目录用于给同事离线安装 ai-inspect。

版本：${version}

包含：

- MCP 命令：\`ai-inspect mcp\`
- Vue/Vite 项目插件：右下角 \`AI 调试\` 按钮、调试面板、元素选择、高亮、历史会话

## macOS / Linux 交互安装

\`\`\`bash
./install.sh
\`\`\`

## macOS / Linux 非交互示例

\`\`\`bash
./install.sh --mode mcp --agent codex
./install.sh --mode mcp --agent claude
./install.sh --mode vite --project /path/to/vite-vue-project
./install.sh --mode all --agent claude --project /path/to/vite-vue-project
\# 明确指定 local 时，才使用当前目录内的 tgz 包
./install.sh --source local --mode all --agent codex --project /path/to/vite-vue-project
\`\`\`

Claude Code 默认写入 user scope，全局可用；一般只需要安装一次。如果要写入当前项目作用域：

\`\`\`bash
./install.sh --mode mcp --agent claude --claude-scope local
\`\`\`

默认使用公网 npm 安装；只有显式传入 \`--source local\` 时才使用本地 tgz：

\`\`\`bash
npm install -g @mashiro39/ai-inspect-cli@${version}
npm install -D @mashiro39/ai-inspect-vite-plugin@${version}
\`\`\`

## Windows PowerShell 交互安装

\`\`\`powershell
Set-ExecutionPolicy -Scope Process Bypass
.\\install.ps1
\`\`\`

## Windows PowerShell 非交互示例

\`\`\`powershell
.\\install.ps1 -Mode mcp -Agent claude
.\\install.ps1 -Mode vite -Project "C:\\path\\to\\vite-vue-project"
.\\install.ps1 -Mode all -Agent codex -Project "C:\\path\\to\\vite-vue-project"
.\\install.ps1 -Source local -Mode all -Agent codex -Project "C:\\path\\to\\vite-vue-project"
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

在 Codex 或 Claude 里说“启用 ai-insert”时，AI 应先调用 MCP 工具 \`start_ai_inspect\`。该工具会静默启动本地 daemon，自动检查/补接入 \`@mashiro39/ai-inspect-vite-plugin\`，启动或复用项目 dev server，检测到 URL 后只返回地址，不主动打开或刷新浏览器，并启动 watcher，不应先去项目里搜索 ai-insert 功能。

业务项目安装 Vite 插件时优先使用 Yarn。检测顺序是：\`packageManager\` 中显式 Yarn、\`yarn.lock\`、\`packageManager\` 中的 pnpm/npm、\`pnpm-lock.yaml\`、本机 Yarn、npm。

watcher 启动后，浏览器面板点击 \`发送\` 会自动触发 Codex 或 Claude 处理最新选择，并把结构化输出实时流式回写到浏览器面板。

浏览器面板交互：

- 点击右下角 \`AI 调试\` 先打开面板，不会立刻进入框选。
- 点击 \`选择\` 后进入元素框选，选中后保留高亮并回到面板。
- 点击 \`发送\` 后，watcher 会把最新选择和输入内容交给 Codex 或 Claude。
- \`Enter\` 发送，\`Shift+Enter\` 换行，\`Esc\` 关闭面板。

运行时状态默认写入当前业务项目的 \`.ai-insert/\` 目录。历史会话会保存到 \`.ai-insert/sessions.json\`，刷新页面或重启本地 daemon 后，可以打开调试面板并通过 \`历史\` 按钮继续查看最近会话；历史会话里再次点击 \`选择\` 后，最新框选会成为该会话的当前选择。历史列表支持红色 \`删除\` 按钮清理旧会话。Vite 插件会忽略 \`.ai-insert/\`，写入历史和日志不会触发页面刷新。

## 工作原理

ai-inspect 分成四层：

- Vite 插件：只在 dev server 中注入浏览器脚本。
- 浏览器面板：负责元素选择、输入指令、历史会话和删除历史。
- 本地 daemon：运行在 \`http://127.0.0.1:17321\`，保存最新选择和会话历史。
- MCP + watcher：让 Codex/Claude 读取结构化前端上下文，并在浏览器点击 \`发送\` 后启动对应 AI。

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

watcher 轮询 daemon，发现新的用户消息后，在业务项目目录中启动 Codex 或 Claude。AI 会通过 MCP 工具读取当前选择、源码片段和历史会话，然后把输出流式写回浏览器面板。

普通新选择会创建新 session；从 \`历史\` 进入的会话会复用旧 session。如果在历史会话里重新点击 \`选择\`，最新框选会替换该会话的当前选择。

\`.ai-insert/\` 放在业务项目中，是为了让历史跟着项目走；Vite 插件会把 \`.ai-insert/\` 加入 watch ignore，所以写入历史和日志不会导致页面刷新。

## Codex 代理与 Reconnecting

首版开始，ai-inspect 触发 Codex 时默认使用 HTTP/SSE 传输，并关闭 Codex 默认的 WebSocket 优先路径：

\`\`\`toml
model_provider = "openai-http"
supports_websockets = false
\`\`\`

这样可以避免本地代理、Clash、SOCKS \`ALL_PROXY\` 等环境下常见的：

- \`Reconnecting... 2/5\`
- \`tls handshake eof\`
- \`stream disconnected before completion\`

watcher 还会自动整理 Codex 子进程代理环境：

- 保留 \`HTTP_PROXY/http_proxy\` 和 \`HTTPS_PROXY/https_proxy\`
- 当存在 HTTP/HTTPS 代理时，移除 SOCKS \`ALL_PROXY/all_proxy\`
- 为本地 daemon 请求补齐 \`NO_PROXY/no_proxy=localhost,127.0.0.1,::1\`

如果需要临时恢复 Codex 原生 WebSocket 行为：

\`\`\`bash
AI_INSPECT_CODEX_TRANSPORT=default ai-inspect watch --project /path/to/vite-vue-project --agent codex
\`\`\`

如果不用 MCP，也可以手动启动：

\`\`\`bash
ai-inspect daemon
ai-inspect watch --project /path/to/vite-vue-project
\`\`\`

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
