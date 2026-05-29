import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentTarget } from './types.js';
import { appendTomlBlock, commandExists, createAgentResult, ensureHookScript } from './shared.js';

const CODEX_MCP_BLOCK = [
  '[mcp_servers.ui-inspect]',
  'type = "stdio"',
  'command = "npx"',
  'args = ["-y", "@ui-inspect/cli@latest", "mcp"]',
].join('\n');

export const codexTarget: AgentTarget = {
  id: 'codex',
  displayName: 'Codex',
  detect(project) {
    return existsSync(join(project, '.codex')) || commandExists('codex');
  },
  install(options) {
    const result = createAgentResult('codex', this.detect(options.project));
    if (options.mcp) {
      const file = join(options.project, '.codex', 'config.toml');
      appendTomlBlock(file, options.dryRun, 'mcp_servers.ui-inspect', CODEX_MCP_BLOCK, result.changes, 'Configure ui-inspect MCP server for Codex.');
      result.mcpConfigured = true;
    }
    if (options.hooks) {
      ensureHookScript(options.project, options.dryRun, result.changes);
      result.warnings.push('Codex hook configuration is version-sensitive; setup installed the shared hook script but did not enable Codex hooks automatically.');
      result.nextSteps.push('For Codex, run ui-inspect setup doctor after confirming your Codex hooks version and config layer.');
    }
    return result;
  },
  printConfig() {
    return CODEX_MCP_BLOCK;
  },
};
