import process from 'node:process';
import { spawnSync } from 'node:child_process';

printSnippets();

function printSnippets() {
  const command = resolveAiInspectCommand();
  console.log('ai-inspect 是通用 MCP 服务。请把以下任一配置片段添加到你的 MCP client/agent。');
  console.log('\nTOML:');
  console.log('[mcp_servers.ai-inspect]\ntype = "stdio"\ncommand = "' + escapeToml(command) + '"\nargs = ["mcp"]');
  console.log('\nJSON:');
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
