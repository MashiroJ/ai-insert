#!/usr/bin/env node
import { DEFAULT_DAEMON_PORT, DEFAULT_DAEMON_URL } from '@mashiro39/ai-inspect-protocol';
import { clearSelection, fetchHealth, fetchSelection, fetchSessions, postMessage, readSelectionSource, startServer, } from '@mashiro39/ai-inspect-server';
import { runMcpStdio } from './mcp.js';
import { runWatch } from './watch.js';
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
    else if (command === 'watch') {
        await runWatch({
            daemonUrl: daemonUrl(),
            project: stringFlag('--project') ?? process.cwd(),
            agent: stringFlag('--agent') ?? 'codex',
            intervalMs: numberFlag('--interval') ?? 1000,
        });
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
    else {
        printHelp();
        process.exit(command === 'help' || command === '--help' || command === '-h' ? 0 : 2);
    }
    if (!['daemon', 'mcp', 'watch'].includes(command))
        process.exit(0);
}
catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
}
function daemonUrl() {
    return stringFlag('--daemon-url') ?? process.env.AI_INSPECT_DAEMON_URL ?? DEFAULT_DAEMON_URL;
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
  ai-inspect daemon [--host 127.0.0.1] [--port 17321]
  ai-inspect mcp [--daemon-url <url>]
  ai-inspect watch [--agent codex] [--project <dir>] [--interval 1000] [--daemon-url <url>]
  ai-inspect status [--daemon-url <url>]
  ai-inspect selection [--json] [--daemon-url <url>]
  ai-inspect sessions [--daemon-url <url>]
  ai-inspect reply --content <text> [--daemon-url <url>]
  ai-inspect source [--context 80] [--json] [--daemon-url <url>]
  ai-inspect clear [--daemon-url <url>]
`);
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