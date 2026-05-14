import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  ].join('\n');
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
  console.log('\nCodex (~/.codex/config.toml):');
  console.log('[mcp_servers.ai-inspect]\ntype = "stdio"\ncommand = "' + escapeToml(command) + '"\nargs = ["mcp"]');
  console.log('\nClaude JSON:');
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
  const first = result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return first || 'ai-inspect';
}

function escapeToml(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function upsertTomlBlock(current, tableName, block) {
  const lines = current.split(/\r?\n/);
  const header = '[' + tableName + ']';
  const start = lines.findIndex((line) => line.trim() === header);
  if (start < 0) return current.trimEnd() + block;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s*\[.+\]\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const replacement = block.trim().split('\n');
  const next = [...lines.slice(0, start), ...replacement, ...lines.slice(end)];
  return next.join('\n').replace(/\n*$/, '\n');
}
