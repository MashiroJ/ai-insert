import { DEFAULT_DAEMON_PORT, DEFAULT_DAEMON_URL, } from '@ui-inspect/protocol';
import { createServer } from 'node:http';
import { ServerState } from './state.js';
import { route } from './routes.js';
import { sendJson } from './http.js';
import { parseDaemonUrl } from './http.js';
export { readSelectionSource } from './source.js';
export { delay } from './utils.js';
export { getVersion } from './version.js';
const state = new ServerState();
export async function startServer(options = {}) {
    const host = options.host ?? '127.0.0.1';
    const port = options.port ?? DEFAULT_DAEMON_PORT;
    let closing = false;
    let server;
    const close = () => {
        if (closing)
            return;
        closing = true;
        server.close(() => resolveClose());
    };
    let resolveClose = () => { };
    server = createServer(async (req, res) => {
        try {
            await route(req, res, state, close);
        }
        catch (err) {
            sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => resolve());
    });
    process.stdout.write(`ui-inspect daemon listening at http://${host}:${port}\n`);
    await new Promise((resolve) => {
        resolveClose = resolve;
        process.once('SIGINT', close);
        process.once('SIGTERM', close);
    });
}
export async function fetchSelection(daemonUrl = DEFAULT_DAEMON_URL) {
    const parsed = parseDaemonUrl(daemonUrl);
    const resp = await fetch(`${parsed}/selection`);
    if (!resp.ok)
        throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
    return (await resp.json());
}
export async function fetchSessions(daemonUrl = DEFAULT_DAEMON_URL) {
    const parsed = parseDaemonUrl(daemonUrl);
    const resp = await fetch(`${parsed}/sessions`);
    if (!resp.ok)
        throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
    return (await resp.json());
}
export async function fetchSession(sessionId, daemonUrl = DEFAULT_DAEMON_URL) {
    const parsed = parseDaemonUrl(daemonUrl);
    const resp = await fetch(`${parsed}/sessions/${encodeURIComponent(sessionId)}`);
    if (!resp.ok)
        throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
    const payload = (await resp.json());
    if (!payload.session)
        throw new Error(`session not found: ${sessionId}`);
    return payload.session;
}
export async function updateSessionStatus(sessionId, status, daemonUrl = DEFAULT_DAEMON_URL) {
    const parsed = parseDaemonUrl(daemonUrl);
    const resp = await fetch(`${parsed}/sessions/${encodeURIComponent(sessionId)}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    if (!resp.ok)
        throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
    const payload = (await resp.json());
    if (!payload.session)
        throw new Error(`session not found: ${sessionId}`);
    return payload.session;
}
export async function postMessage(content, role = 'assistant', daemonUrl = DEFAULT_DAEMON_URL, options = {}) {
    const parsed = parseDaemonUrl(daemonUrl);
    const resp = await fetch(`${parsed}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, content, mode: options.mode, sessionId: options.sessionId }),
    });
    if (!resp.ok)
        throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
    const payload = (await resp.json());
    return payload.message;
}
export async function clearSelection(daemonUrl = DEFAULT_DAEMON_URL) {
    const parsed = parseDaemonUrl(daemonUrl);
    const resp = await fetch(`${parsed}/selection/clear`, { method: 'POST' });
    if (!resp.ok)
        throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
}
export async function fetchHealth(daemonUrl = DEFAULT_DAEMON_URL) {
    const parsed = parseDaemonUrl(daemonUrl);
    const resp = await fetch(`${parsed}/health`);
    if (!resp.ok)
        throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
    return (await resp.json());
}
export async function shutdownDaemon(daemonUrl = DEFAULT_DAEMON_URL) {
    const parsed = parseDaemonUrl(daemonUrl);
    const resp = await fetch(`${parsed}/shutdown`, { method: 'POST' });
    if (!resp.ok)
        throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
}
//# sourceMappingURL=index.js.map