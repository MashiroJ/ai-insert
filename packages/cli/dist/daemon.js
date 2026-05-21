import { DEFAULT_DAEMON_PORT } from '@ui-inspect/protocol';
import { fetchHealth } from '@ui-inspect/server';
import { spawn } from 'node:child_process';
const CONSECUTIVE_HEALTH_CHECKS = 2;
const HEALTH_CHECK_INTERVAL_MS = 100;
export async function ensureDaemon({ daemonUrl, project, timeoutMs = 2500 }) {
    const parsed = parseLocalDaemonUrl(daemonUrl);
    if (!parsed) {
        throw new Error(`ui-inspect daemon is not running at ${daemonUrl}. Auto-start only supports localhost daemon URLs.`);
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
            UI_INSPECT_PROJECT: project ?? process.cwd(),
        },
    }).unref();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await isHealthyWithRetry(daemonUrl, CONSECUTIVE_HEALTH_CHECKS, HEALTH_CHECK_INTERVAL_MS))
            return;
        await delay(HEALTH_CHECK_INTERVAL_MS);
    }
    throw new Error(`ui-inspect daemon did not become ready at ${daemonUrl}`);
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
//# sourceMappingURL=daemon.js.map