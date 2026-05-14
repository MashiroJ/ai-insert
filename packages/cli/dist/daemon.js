import { DEFAULT_DAEMON_PORT } from '@mashiro39/ai-inspect-protocol';
import { fetchHealth } from '@mashiro39/ai-inspect-server';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const CONSECUTIVE_HEALTH_CHECKS = 2;
const HEALTH_CHECK_INTERVAL_MS = 100;
export async function ensureDaemon({ daemonUrl, project, timeoutMs = 2500 }) {
    const parsed = parseLocalDaemonUrl(daemonUrl);
    if (!parsed) {
        throw new Error(`ai-inspect daemon is not running at ${daemonUrl}. Auto-start only supports localhost daemon URLs.`);
    }
    if (await isHealthyWithRetry(daemonUrl, CONSECUTIVE_HEALTH_CHECKS, HEALTH_CHECK_INTERVAL_MS))
        return;
    const entry = process.argv[1];
    spawn(process.execPath, [entry, 'daemon', '--host', parsed.host, '--port', String(parsed.port)], {
        cwd: project ?? process.cwd(),
        detached: true,
        stdio: 'ignore',
        env: {
            ...process.env,
            AI_INSPECT_PROJECT: project ?? process.cwd(),
        },
    }).unref();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await isHealthyWithRetry(daemonUrl, CONSECUTIVE_HEALTH_CHECKS, HEALTH_CHECK_INTERVAL_MS))
            return;
        await delay(HEALTH_CHECK_INTERVAL_MS);
    }
    throw new Error(`ai-inspect daemon did not become ready at ${daemonUrl}`);
}
async function isHealthyWithRetry(daemonUrl, attempts, intervalMs) {
    for (let i = 0; i < attempts; i++) {
        if (!(await isHealthy(daemonUrl)))
            return false;
        if (i < attempts - 1)
            await delay(intervalMs);
    }
    return true;
}
async function isHealthy(daemonUrl) {
    try {
        const health = await fetchHealth(daemonUrl);
        return health.ok === true;
    }
    catch {
        return false;
    }
}
function parseLocalDaemonUrl(daemonUrl) {
    let url;
    try {
        url = new URL(daemonUrl);
        if (url.protocol !== 'http:') {
            return null;
        }
    }
    catch {
        return null;
    }
    if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname))
        return null;
    return {
        host: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname.replace(/^\[(.*)\]$/, '$1'),
        port: url.port ? Number(url.port) : DEFAULT_DAEMON_PORT,
    };
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function startWatcher({ daemonUrl, project = process.cwd(), agent = 'codex' }) {
    if (watcherIsAlreadyRunning(project, daemonUrl))
        return;
    const entry = process.argv[1];
    spawn(process.execPath, [entry, 'watch', '--daemon-url', daemonUrl, '--project', project, '--agent', agent], {
        detached: true,
        stdio: 'ignore',
        env: {
            ...process.env,
            AI_INSPECT_WATCHER: '1',
        },
    }).unref();
}
function watcherIsAlreadyRunning(project, daemonUrl) {
    const file = join(project, '.ai-insert', `watcher-${safeName(daemonUrl)}.pid`);
    if (!existsSync(file))
        return false;
    const pid = Number(readFileSync(file, 'utf8').trim());
    if (!Number.isFinite(pid))
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function safeName(value) {
    return value.replace(/[^a-zA-Z0-9_.-]+/g, '_');
}
//# sourceMappingURL=daemon.js.map