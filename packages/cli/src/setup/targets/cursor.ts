import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentTarget } from './types.js';
import {
  commandExists,
  createAgentResult,
  ensureHookScript,
  isRecord,
  jsonString,
  mergeJsonFile,
  UI_INSPECT_MCP,
} from './shared.js';

export const cursorTarget: AgentTarget = {
  id: 'cursor',
  displayName: 'Cursor',
  detect(project) {
    return existsSync(join(project, '.cursor')) || commandExists('cursor');
  },
  install(options) {
    const result = createAgentResult('cursor', this.detect(options.project));
    if (options.mcp) {
      const file = join(options.project, '.cursor', 'mcp.json');
      mergeJsonFile(file, options.dryRun, (json) => {
        json.mcpServers = isRecord(json.mcpServers) ? json.mcpServers : {};
        json.mcpServers['ui-inspect'] = UI_INSPECT_MCP;
      }, result.changes, 'Configure ui-inspect MCP server for Cursor.');
      result.mcpConfigured = true;
    }
    if (options.hooks) {
      const script = ensureHookScript(options.project, options.dryRun, result.changes);
      const file = join(options.project, '.cursor', 'hooks.json');
      mergeJsonFile(file, options.dryRun, (json) => {
        json.version = typeof json.version === 'number' ? json.version : 1;
        json.hooks = isRecord(json.hooks) ? json.hooks : {};
        addCursorHook(json.hooks, 'beforeSubmitPrompt', `node ${jsonString(script)} --agent cursor --event before-submit-prompt`);
        addCursorHook(json.hooks, 'stop', `node ${jsonString(script)} --agent cursor --event stop`);
      }, result.changes, 'Configure Cursor hooks to steer ui-inspect startup and pending browser tasks.');
      result.hooksConfigured = true;
    }
    result.nextSteps.push('Reload Cursor after setup so project MCP and hooks are picked up.');
    return result;
  },
  printConfig() {
    return JSON.stringify({ mcpServers: { 'ui-inspect': UI_INSPECT_MCP } }, null, 2);
  },
};

function addCursorHook(hooks: Record<string, any>, event: string, command: string): void {
  const existing = Array.isArray(hooks[event]) ? hooks[event] : [];
  if (!existing.some((item) => item && item.command === command)) {
    existing.push({ command });
  }
  hooks[event] = existing;
}
