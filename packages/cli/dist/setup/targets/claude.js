import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { commandExists, createAgentResult, ensureHookScript, isRecord, jsonString, mergeJsonFile, UI_INSPECT_MCP, } from './shared.js';
export const claudeTarget = {
    id: 'claude',
    displayName: 'Claude Code',
    detect(project) {
        return existsSync(join(project, '.claude')) || commandExists('claude');
    },
    install(options) {
        const result = createAgentResult('claude', this.detect(options.project));
        if (options.mcp) {
            const file = join(options.project, '.mcp.json');
            mergeJsonFile(file, options.dryRun, (json) => {
                json.mcpServers = isRecord(json.mcpServers) ? json.mcpServers : {};
                json.mcpServers['ui-inspect'] = UI_INSPECT_MCP;
            }, result.changes, 'Configure ui-inspect MCP server for Claude-compatible project MCP.');
            result.mcpConfigured = true;
        }
        if (options.hooks) {
            const script = ensureHookScript(options.project, options.dryRun, result.changes);
            const file = join(options.project, '.claude', 'settings.json');
            mergeJsonFile(file, options.dryRun, (json) => {
                json.hooks = isRecord(json.hooks) ? json.hooks : {};
                addClaudeHook(json.hooks, 'UserPromptSubmit', `node ${jsonString(script)} --agent claude --event user-prompt-submit`);
                addClaudeHook(json.hooks, 'Stop', `node ${jsonString(script)} --agent claude --event stop`);
            }, result.changes, 'Configure Claude hooks to steer ui-inspect startup and pending browser tasks.');
            result.hooksConfigured = true;
        }
        result.nextSteps.push('Restart Claude Code or reload its project config so MCP and hooks are picked up.');
        return result;
    },
    printConfig() {
        return JSON.stringify({ mcpServers: { 'ui-inspect': UI_INSPECT_MCP } }, null, 2);
    },
};
function addClaudeHook(hooks, event, command) {
    const existing = Array.isArray(hooks[event]) ? hooks[event] : [];
    if (!existing.some((item) => JSON.stringify(item).includes(command))) {
        existing.push({ hooks: [{ type: 'command', command }] });
    }
    hooks[event] = existing;
}
//# sourceMappingURL=claude.js.map