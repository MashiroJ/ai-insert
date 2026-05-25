#!/usr/bin/env node
import { DEFAULT_DAEMON_PORT, DEFAULT_DAEMON_URL } from '@ui-inspect/protocol';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { clearSelection, fetchHealth, fetchSelection, fetchSessions, postMessage, readSelectionSource, startServer, } from '@ui-inspect/server';
import { runMcpStdio } from './mcp.js';
import { updateProjectIntegrationPackages } from './project-setup.js';
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
    else if (command === 'reply') {
        const content = stringFlag('--content') ?? args.slice(1).filter((arg) => !arg.startsWith('--')).join(' ').trim();
        if (!content)
            throw new Error('reply content is required');
        const message = await postMessage(content, 'assistant', daemonUrl());
        process.stdout.write(`${JSON.stringify({ ok: true, message }, null, 2)}\n`);
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
function printHelp() {
    process.stdout.write(`Usage:
  ui-inspect daemon [--host 127.0.0.1] [--port 17321]
  ui-inspect mcp [--daemon-url <url>]
  ui-inspect status [--daemon-url <url>]
  ui-inspect selection [--json] [--daemon-url <url>]
  ui-inspect sessions [--daemon-url <url>]
  ui-inspect reply --content <text> [--daemon-url <url>]
  ui-inspect source [--context 80] [--json] [--daemon-url <url>]
  ui-inspect clear [--daemon-url <url>]
  ui-inspect update [--project <path>] [--dry-run] [--json] [--tag latest] [--self]
`);
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