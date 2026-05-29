import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { SetupChange } from '../../setup.js';
import type { SetupAgentId, SetupAgentResult } from './types.js';

export const UI_INSPECT_MCP = {
  command: 'npx',
  args: ['-y', '@ui-inspect/cli@latest', 'mcp'],
};

export function createAgentResult(agent: SetupAgentId, detected: boolean): SetupAgentResult {
  return {
    agent,
    detected,
    mcpConfigured: false,
    hooksConfigured: false,
    changes: [],
    warnings: [],
    nextSteps: [],
  };
}

export function mergeJsonFile(
  file: string,
  dryRun: boolean,
  mutate: (json: Record<string, any>) => void,
  changes: SetupChange[],
  description: string,
): void {
  const existed = existsSync(file);
  const json = existed ? readJsonFile(file) : {};
  const before = JSON.stringify(json, null, 2);
  mutate(json);
  const after = `${JSON.stringify(json, null, 2)}\n`;
  if (dryRun) {
    changes.push({ file, action: 'planned', description });
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  if (before + '\n' === after) {
    changes.push({ file, action: 'skipped', description });
    return;
  }
  writeFileSync(file, after);
  changes.push({ file, action: existed ? 'updated' : 'created', description });
}

export function readJsonFile(file: string): Record<string, any> {
  try {
    const value = JSON.parse(readFileSync(file, 'utf8'));
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

export function appendTomlBlock(
  file: string,
  dryRun: boolean,
  marker: string,
  block: string,
  changes: SetupChange[],
  description: string,
): void {
  const existed = existsSync(file);
  const content = existed ? readFileSync(file, 'utf8') : '';
  if (content.includes(`[${marker}]`)) {
    changes.push({ file, action: 'skipped', description });
    return;
  }
  if (dryRun) {
    changes.push({ file, action: 'planned', description });
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  const next = `${content.trimEnd()}${content.trim() ? '\n\n' : ''}${block}\n`;
  writeFileSync(file, next);
  changes.push({ file, action: existed ? 'updated' : 'created', description });
}

export function ensureHookScript(project: string, dryRun: boolean, changes: SetupChange[]): string {
  const file = join(project, '.ui-inspect', 'hooks', 'ui-inspect-hook.mjs');
  const content = hookScriptSource();
  if (dryRun) {
    changes.push({ file, action: 'planned', description: 'Install shared ui-inspect agent hook dispatcher.' });
    return file;
  }
  mkdirSync(dirname(file), { recursive: true });
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (existing === content) {
    changes.push({ file, action: 'skipped', description: 'Shared ui-inspect hook dispatcher is already current.' });
    return file;
  }
  writeFileSync(file, content);
  changes.push({ file, action: existing ? 'updated' : 'created', description: 'Install shared ui-inspect agent hook dispatcher.' });
  return file;
}

function hookScriptSource(): string {
  return `#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const agent = flag('--agent') || 'unknown';
const event = flag('--event') || 'unknown';
const input = await readStdin();
const payload = safeJson(input);
const cwd = payload.cwd || process.cwd();

if (/prompt/i.test(event)) {
  const prompt = String(payload.prompt || payload.user_prompt || payload.message || input || '');
  if (/ui-inspect|UI 检查|启用 ui-inspect|使用 ui-inspect|start ui-inspect|enable ui-inspect/i.test(prompt)) {
    emitContext('ui-inspect is requested. Call start_ui_inspect first, then wait_for_frontend_request. When a browser task arrives, update status to working, edit source, then complete_frontend_request.');
  } else {
    allow();
  }
} else if (/stop/i.test(event)) {
  const pending = pendingSessions(cwd);
  if (pending.length > 0) {
    const text = 'ui-inspect has pending browser task(s): ' + pending.map((item) => item.id).join(', ') + '. Continue by calling wait_for_frontend_request or ui-inspect wait.';
    if (agent === 'claude') {
      console.log(JSON.stringify({ decision: 'block', reason: text }));
    } else {
      emitContext(text);
    }
  } else {
    allow();
  }
} else {
  allow();
}

function flag(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : '';
}

async function readStdin() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return raw;
}

function safeJson(value) {
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

function pendingSessions(root) {
  const file = join(root, '.ui-inspect', 'sessions.json');
  if (!existsSync(file)) return [];
  try {
    const payload = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(payload.sessions) ? payload.sessions.filter((session) => session && session.status === 'sent') : [];
  } catch {
    return [];
  }
}

function emitContext(text) {
  if (agent === 'claude') {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: event === 'stop' ? 'Stop' : 'UserPromptSubmit', additionalContext: text } }));
  } else if (agent === 'cursor') {
    console.log(JSON.stringify({ continue: true, permission: 'allow', additionalContext: text }));
  } else {
    console.log(text);
  }
}

function allow() {
  if (agent === 'cursor') console.log(JSON.stringify({ continue: true, permission: 'allow' }));
}
`;
}

export function commandExists(command: string): boolean {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

export function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function jsonString(value: string): string {
  return JSON.stringify(value);
}
