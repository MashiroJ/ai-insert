import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { applyEdits, modify, parse } from 'jsonc-parser';
import { commandExists, createAgentResult, ensureHookScript } from './shared.js';
const OPENCODE_MCP = {
    type: 'local',
    command: ['npx', '-y', '@ui-inspect/cli@latest', 'mcp'],
    enabled: true,
};
export const opencodeTarget = {
    id: 'opencode',
    displayName: 'OpenCode',
    detect(project) {
        return existsSync(opencodeConfigPath(project)) || existsSync(join(project, '.opencode')) || commandExists('opencode');
    },
    install(options) {
        const result = createAgentResult('opencode', this.detect(options.project));
        if (options.mcp) {
            const file = opencodeConfigPath(options.project);
            writeOpenCodeMcp(file, options.dryRun, result.changes);
            result.mcpConfigured = true;
        }
        if (options.hooks) {
            ensureHookScript(options.project, options.dryRun, result.changes);
            result.warnings.push('OpenCode hooks are plugin-based; setup installed the shared hook script but did not generate an OpenCode plugin yet.');
        }
        result.nextSteps.push('Reload OpenCode after setup so project MCP config is picked up.');
        return result;
    },
    printConfig() {
        return JSON.stringify({
            $schema: 'https://opencode.ai/config.json',
            mcp: { 'ui-inspect': OPENCODE_MCP },
        }, null, 2);
    },
};
function opencodeConfigPath(project) {
    const jsonc = join(project, 'opencode.jsonc');
    const json = join(project, 'opencode.json');
    if (existsSync(jsonc))
        return jsonc;
    if (existsSync(json))
        return json;
    return jsonc;
}
function writeOpenCodeMcp(file, dryRun, changes) {
    const description = 'Configure ui-inspect MCP server for OpenCode.';
    const existed = existsSync(file);
    let text = existed ? readFileSync(file, 'utf8') : '';
    if (!text.trim()) {
        text = '{\n  "$schema": "https://opencode.ai/config.json"\n}\n';
    }
    const config = parseConfig(text);
    const before = config.mcp?.['ui-inspect'];
    if (JSON.stringify(before) === JSON.stringify(OPENCODE_MCP)) {
        changes.push({ file, action: 'skipped', description });
        return;
    }
    if (dryRun) {
        changes.push({ file, action: 'planned', description });
        return;
    }
    mkdirSync(dirname(file), { recursive: true });
    if (typeof config.$schema !== 'string') {
        text = applyEdits(text, modify(text, ['$schema'], 'https://opencode.ai/config.json', {
            formattingOptions: FORMATTING,
        }));
    }
    const next = applyEdits(text, modify(text, ['mcp', 'ui-inspect'], OPENCODE_MCP, {
        formattingOptions: FORMATTING,
    }));
    writeFileSync(file, next);
    changes.push({ file, action: existed ? 'updated' : 'created', description });
}
function parseConfig(text) {
    const errors = [];
    const value = parse(text, errors, { allowTrailingComma: true });
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
const FORMATTING = { tabSize: 2, insertSpaces: true, eol: '\n' };
//# sourceMappingURL=opencode.js.map