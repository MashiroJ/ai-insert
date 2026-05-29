#!/usr/bin/env node
import { DEFAULT_DAEMON_PORT, DEFAULT_DAEMON_URL } from '@ui-inspect/protocol';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { clearSelection, fetchHealth, fetchSelection, fetchSessions, postMessage, readSelectionSource, startServer, updateSessionStatus, } from '@ui-inspect/server';
import { completeFrontendRequestFlow, normalizeCompleteFrontendRequestArgs, runMcpStdio, waitForFrontendRequest } from './mcp.js';
import { updateProjectIntegrationPackages } from './project-setup.js';
import { setupUiInspect } from './setup.js';
import { getVersion } from './version.js';
ensureLocalNoProxy();
const args = process.argv.slice(2);
const command = args[0] ?? 'help';
try {
    if (command === 'daemon') {
        const port = numberFlag('--port') ?? DEFAULT_DAEMON_PORT;
        const host = stringFlag('--host') ?? '127.0.0.1';
        await startServer({ host, port });
    }
    else if (command === 'mcp') {
        await runMcpStdio({ daemonUrl: daemonUrl() });
    }
    else if (command === 'status') {
        const health = await fetchHealth(daemonUrl());
        process.stdout.write(`${JSON.stringify(health, null, 2)}\n`);
    }
    else if (command === 'selection') {
        const payload = await fetchSelection(daemonUrl());
        if (hasFlag('--json')) {
            process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        }
        else if (!payload.active || !payload.selection) {
            process.stdout.write('No active selection.\n');
        }
        else {
            const s = payload.selection;
            process.stdout.write([
                `Selected: ${s.dom.tagName}${s.dom.id ? `#${s.dom.id}` : ''}`,
                `URL: ${s.url}`,
                `Selector: ${s.dom.selector}`,
                `Component: ${s.vue?.componentName ?? '(none)'}`,
                `Source: ${s.source.file ?? '(none)'}`,
                `Instruction: ${s.instruction || '(none)'}`,
                `Session: ${s.sessionId}`,
            ].join('\n') + '\n');
        }
    }
    else if (command === 'sessions') {
        const payload = await fetchSessions(daemonUrl());
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    }
    else if (command === 'wait') {
        const result = await waitForFrontendRequest(waitArgs(), daemonUrl(), stringFlag('--session-id') ?? undefined);
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }
    else if (command === 'task-status') {
        const status = statusFlag();
        const sessionId = stringFlag('--session-id') ?? await currentSessionId();
        const session = await updateSessionStatus(sessionId, status, daemonUrl());
        process.stdout.write(`${JSON.stringify({ ok: true, session }, null, 2)}\n`);
    }
    else if (command === 'reply') {
        const content = stringFlag('--content') ?? positionalContent();
        if (!content)
            throw new Error('reply content is required');
        const message = await postMessage(content, 'assistant', daemonUrl(), { sessionId: stringFlag('--session-id') ?? undefined });
        process.stdout.write(`${JSON.stringify({ ok: true, message }, null, 2)}\n`);
    }
    else if (command === 'complete') {
        const content = stringFlag('--content') ?? positionalContent();
        const normalized = normalizeCompleteFrontendRequestArgs({
            sessionId: stringFlag('--session-id'),
            content,
            afterRequestId: stringFlag('--after-request-id'),
            status: stringFlag('--status') ?? 'done',
            context: numberFlag('--context') ?? undefined,
            timeoutMs: numberFlag('--timeout-ms') ?? undefined,
            sinceTimestamp: numberFlag('--since-timestamp') ?? undefined,
            responseMode: stringFlag('--response-mode') ?? undefined,
        }, Date.now());
        const result = await completeFrontendRequestFlow(normalized, daemonUrl());
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }
    else if (command === 'source') {
        const context = numberFlag('--context') ?? 80;
        const payload = await fetchSelection(daemonUrl());
        if (!payload.active || !payload.selection)
            throw new Error('No active selection.');
        const source = await readSelectionSource(payload.selection, context);
        if (hasFlag('--json'))
            process.stdout.write(`${JSON.stringify(source, null, 2)}\n`);
        else
            process.stdout.write(`${source.content}\n`);
    }
    else if (command === 'clear') {
        await clearSelection(daemonUrl());
        process.stdout.write('Selection cleared.\n');
    }
    else if (command === 'setup') {
        const project = resolve(stringFlag('--project') ?? process.cwd());
        const target = setupTarget(args[1]);
        const result = setupUiInspect({
            project,
            target: target === 'doctor' ? 'all' : target,
            agent: setupAgentFlag(),
            dryRun: hasFlag('--dry-run') || target === 'doctor',
            hooks: !hasFlag('--no-hooks'),
            mcp: !hasFlag('--no-mcp'),
        });
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }
    else if (command === 'update') {
        const project = resolve(stringFlag('--project') ?? process.cwd());
        const dryRun = hasFlag('--dry-run');
        const json = hasFlag('--json');
        const tag = stringFlag('--tag') ?? 'latest';
        const result = updateProjectIntegrationPackages({
            project,
            dryRun,
            tag,
            silent: json,
        });
        const self = hasFlag('--self') ? updateSelfCli({ dryRun, tag, silent: json }) : null;
        const payload = {
            ok: result.packages.every((pkg) => pkg.dryRun || pkg.updated),
            cli: {
                version: getVersion(),
                self,
            },
            project: result,
        };
        if (json) {
            process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        }
        else {
            printUpdateResult(result, self);
        }
    }
    else {
        printHelp();
        process.exit(command === 'help' || command === '--help' || command === '-h' ? 0 : 2);
    }
    if (!['daemon', 'mcp'].includes(command))
        process.exit(0);
}
catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
}
function daemonUrl() {
    return stringFlag('--daemon-url') ?? process.env.UI_INSPECT_DAEMON_URL ?? DEFAULT_DAEMON_URL;
}
function hasFlag(name) {
    return args.includes(name);
}
function stringFlag(name) {
    const index = args.indexOf(name);
    if (index < 0)
        return null;
    const value = args[index + 1];
    return value && !value.startsWith('--') ? value : null;
}
function numberFlag(name) {
    const raw = stringFlag(name);
    if (!raw)
        return null;
    const value = Number(raw);
    if (!Number.isFinite(value))
        throw new Error(`${name} must be a number`);
    return value;
}
function positionalContent() {
    const values = [];
    for (let index = 1; index < args.length; index += 1) {
        const value = args[index];
        if (value.startsWith('--')) {
            const next = args[index + 1];
            if (next && !next.startsWith('--'))
                index += 1;
            continue;
        }
        values.push(value);
    }
    return values.join(' ').trim();
}
function printHelp() {
    process.stdout.write(`Usage:
  ui-inspect daemon [--host 127.0.0.1] [--port 17321]
  ui-inspect mcp [--daemon-url <url>]
  ui-inspect status [--daemon-url <url>]
  ui-inspect selection [--json] [--daemon-url <url>]
  ui-inspect sessions [--daemon-url <url>]
  ui-inspect wait [--timeout-ms <ms>] [--context <lines>] [--since-timestamp <ms>] [--after-request-id <id>] [--session-id <id>] [--response-mode compact|full] [--daemon-url <url>]
  ui-inspect task-status --status claimed|working|done|failed [--session-id <id>] [--daemon-url <url>]
  ui-inspect reply --content <text> [--session-id <id>] [--daemon-url <url>]
  ui-inspect complete --session-id <id> --after-request-id <id> --content <text> [--status done|failed] [--timeout-ms <ms>] [--context <lines>] [--response-mode compact|full] [--daemon-url <url>]
  ui-inspect source [--context 80] [--json] [--daemon-url <url>]
  ui-inspect clear [--daemon-url <url>]
  ui-inspect setup [all|agent|project|doctor] [--agent auto|claude|cursor|codex|opencode|none] [--project <path>] [--dry-run] [--no-hooks] [--no-mcp]
  ui-inspect update [--project <path>] [--dry-run] [--json] [--tag latest] [--self]
`);
}
function waitArgs() {
    return {
        timeoutMs: numberFlag('--timeout-ms') ?? undefined,
        context: numberFlag('--context') ?? undefined,
        sinceTimestamp: numberFlag('--since-timestamp') ?? undefined,
        afterRequestId: stringFlag('--after-request-id') ?? undefined,
        responseMode: stringFlag('--response-mode') ?? undefined,
    };
}
function statusFlag() {
    const status = stringFlag('--status');
    if (status === 'claimed' || status === 'working' || status === 'done' || status === 'failed')
        return status;
    throw new Error('--status must be claimed, working, done, or failed');
}
async function currentSessionId() {
    const payload = await fetchSelection(daemonUrl());
    const sessionId = payload.selection?.sessionId;
    if (!payload.active || !sessionId)
        throw new Error('--session-id is required when there is no active selection');
    return sessionId;
}
function setupTarget(value) {
    if (!value || value.startsWith('--'))
        return 'all';
    if (value === 'all' || value === 'agent' || value === 'project' || value === 'doctor')
        return value;
    throw new Error('setup target must be all, agent, project, or doctor');
}
function setupAgentFlag() {
    const agent = stringFlag('--agent') ?? 'auto';
    if (agent === 'auto' || agent === 'claude' || agent === 'cursor' || agent === 'codex' || agent === 'opencode' || agent === 'none')
        return agent;
    throw new Error('--agent must be auto, claude, cursor, codex, opencode, or none');
}
function updateSelfCli({ dryRun, tag, silent }) {
    const target = `@ui-inspect/cli@${tag}`;
    const args = ['install', '-g', target];
    const result = {
        target,
        command: 'npm',
        args,
        dryRun,
        updated: false,
        error: null,
    };
    if (dryRun)
        return result;
    const spawnResult = spawnSync('npm', args, {
        stdio: silent ? 'pipe' : 'inherit',
        shell: process.platform === 'win32',
    });
    result.updated = spawnResult.status === 0;
    if (!result.updated) {
        result.error = spawnResult.error?.message ?? `npm ${args.join(' ')} exited with ${spawnResult.status ?? 'unknown status'}`;
    }
    return result;
}
function printUpdateResult(result, self) {
    const lines = [
        `ui-inspect update`,
        `CLI version: ${getVersion()}`,
        `Project: ${result.project}`,
        `Detected: ${result.projectType}`,
    ];
    if (result.packageManager)
        lines.push(`Package manager: ${result.packageManager}`);
    lines.push('');
    if (result.packages.length > 0) {
        lines.push('Frontend integration packages:');
        for (const pkg of result.packages) {
            const prefix = pkg.dryRun ? 'would run' : pkg.updated ? 'updated' : 'failed';
            lines.push(`- ${pkg.name}: ${prefix} \`${pkg.command} ${pkg.args.join(' ')}\`${pkg.current ? ` (current: ${pkg.current})` : ''}`);
            if (pkg.error)
                lines.push(`  error: ${pkg.error}`);
        }
    }
    else {
        lines.push('Frontend integration packages: none updated automatically.');
    }
    if (self) {
        lines.push('');
        lines.push(`CLI self update: ${self.dryRun ? 'would run' : self.updated ? 'updated' : 'failed'} \`${self.command} ${self.args.join(' ')}\``);
        if (self.error)
            lines.push(`  error: ${self.error}`);
    }
    else {
        lines.push('');
        lines.push('CLI self update: skipped. If you installed ui-inspect globally, run `ui-inspect update --self`; MCP configs using `npx -y @ui-inspect/cli@latest mcp` only need an agent restart.');
    }
    if (result.warnings.length > 0) {
        lines.push('');
        lines.push('Warnings:');
        for (const warning of result.warnings)
            lines.push(`- ${warning}`);
    }
    if (result.nextSteps.length > 0) {
        lines.push('');
        lines.push('Next steps:');
        for (const step of result.nextSteps)
            lines.push(`- ${step}`);
    }
    process.stdout.write(`${lines.join('\n')}\n`);
}
function ensureLocalNoProxy() {
    const noProxy = mergeNoProxy(process.env.NO_PROXY || process.env.no_proxy || '');
    process.env.NO_PROXY = noProxy;
    process.env.no_proxy = noProxy;
}
function mergeNoProxy(value) {
    const required = ['localhost', '127.0.0.1', '::1'];
    const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
    for (const item of required) {
        if (!parts.some((part) => part.toLowerCase() === item.toLowerCase()))
            parts.push(item);
    }
    return parts.join(',');
}
//# sourceMappingURL=index.js.map