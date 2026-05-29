import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { setupUiInspect } from './setup.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('setupUiInspect', () => {
  it('installs Claude project MCP and hooks config', () => {
    const project = tempProject();
    mkdirSync(join(project, '.claude'));

    const result = setupUiInspect({
      project,
      target: 'agent',
      agent: 'claude',
    });

    expect(result.agents[0]).toMatchObject({
      agent: 'claude',
      mcpConfigured: true,
      hooksConfigured: true,
    });
    const mcp = JSON.parse(readFileSync(join(project, '.mcp.json'), 'utf8'));
    expect(mcp.mcpServers['ui-inspect']).toEqual({
      command: 'npx',
      args: ['-y', '@ui-inspect/cli@latest', 'mcp'],
    });
    const settings = JSON.parse(readFileSync(join(project, '.claude/settings.json'), 'utf8'));
    expect(settings.hooks.UserPromptSubmit[0].hooks[0].command).toContain('ui-inspect-hook.mjs');
    expect(settings.hooks.Stop[0].hooks[0].command).toContain('--event stop');
    expect(existsSync(join(project, '.ui-inspect/hooks/ui-inspect-hook.mjs'))).toBe(true);
  });

  it('installs Cursor project MCP and hooks config', () => {
    const project = tempProject();
    mkdirSync(join(project, '.cursor'));

    setupUiInspect({
      project,
      target: 'agent',
      agent: 'cursor',
    });

    const mcp = JSON.parse(readFileSync(join(project, '.cursor/mcp.json'), 'utf8'));
    expect(mcp.mcpServers['ui-inspect'].command).toBe('npx');
    const hooks = JSON.parse(readFileSync(join(project, '.cursor/hooks.json'), 'utf8'));
    expect(hooks.version).toBe(1);
    expect(hooks.hooks.beforeSubmitPrompt[0].command).toContain('--agent cursor');
    expect(hooks.hooks.stop[0].command).toContain('--event stop');
  });

  it('installs OpenCode project MCP config without writing agent instructions', () => {
    const project = tempProject();

    const result = setupUiInspect({
      project,
      target: 'agent',
      agent: 'opencode',
      hooks: false,
    });

    expect(result.agents[0]).toMatchObject({
      agent: 'opencode',
      mcpConfigured: true,
      hooksConfigured: false,
    });
    const config = JSON.parse(readFileSync(join(project, 'opencode.jsonc'), 'utf8'));
    expect(config.mcp['ui-inspect']).toEqual({
      type: 'local',
      command: ['npx', '-y', '@ui-inspect/cli@latest', 'mcp'],
      enabled: true,
    });
    expect(existsSync(join(project, 'AGENTS.md'))).toBe(false);
  });

  it('preserves OpenCode jsonc comments when adding MCP config', () => {
    const project = tempProject();
    writeFileSync(join(project, 'opencode.jsonc'), [
      '{',
      '  // keep this comment',
      '  "$schema": "https://opencode.ai/config.json"',
      '}',
      '',
    ].join('\n'));

    setupUiInspect({
      project,
      target: 'agent',
      agent: 'opencode',
      hooks: false,
    });

    const text = readFileSync(join(project, 'opencode.jsonc'), 'utf8');
    expect(text).toContain('// keep this comment');
    expect(text).toContain('"ui-inspect"');
  });

  it('does not write files during dry-run', () => {
    const project = tempProject();

    const result = setupUiInspect({
      project,
      target: 'agent',
      agent: 'claude',
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.agents[0].changes.map((change) => change.action)).toContain('planned');
    expect(existsSync(join(project, '.mcp.json'))).toBe(false);
    expect(existsSync(join(project, '.claude/settings.json'))).toBe(false);
  });

  it('reuses Vite project integration during full setup', () => {
    const project = tempProject({
      dependencies: { vite: '^6.0.0' },
      devDependencies: { '@ui-inspect/vite-plugin': '0.2.8' },
    });
    writeFileSync(join(project, 'vite.config.ts'), [
      "import { defineConfig } from 'vite';",
      '',
      'export default defineConfig({ plugins: [] });',
      '',
    ].join('\n'));

    const result = setupUiInspect({
      project,
      target: 'project',
      agent: 'none',
    });

    expect(result.projectIntegration?.projectType).toBe('vite');
    expect(result.projectIntegration?.patched).toBe(true);
    expect(readFileSync(join(project, 'vite.config.ts'), 'utf8')).toContain('uiInspect(),');
  });
});

function tempProject(packageJson: Record<string, unknown> = { name: 'test-project', version: '0.0.0' }): string {
  const project = mkdtempSync(join(tmpdir(), 'ui-inspect-setup-test-'));
  roots.push(project);
  writeFileSync(join(project, 'package.json'), JSON.stringify(packageJson, null, 2));
  return project;
}
