import { DEFAULT_DAEMON_PORT, DEFAULT_DAEMON_URL, } from '@mashiro39/ai-inspect-protocol';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isRecord, numberOr, stringOr, trimUrl } from './utils.js';
const VERSION = '0.1.0';
const SELECTION_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_SESSIONS = 100;
const MAX_MESSAGES_PER_SESSION = 200;
const PROJECT_STATE_DIR = '.ai-insert';
const SESSIONS_FILE = 'sessions.json';
class ServerState {
    currentSelection = null;
    currentSelectionReceivedAt = 0;
    projectRoot = path.resolve(process.env.AI_INSPECT_PROJECT || process.cwd());
    sessions = new Map();
    sessionStreams = new Map();
    constructor() {
        this.loadSessions();
        this.startCleanupInterval();
    }
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupDeadStreams();
        }, CLEANUP_INTERVAL_MS);
    }
    cleanupDeadStreams() {
        for (const [sessionId, streams] of this.sessionStreams.entries()) {
            const alive = new Set();
            for (const res of streams) {
                if (!res.destroyed) {
                    alive.add(res);
                }
            }
            if (alive.size === 0) {
                this.sessionStreams.delete(sessionId);
            }
            else if (alive.size !== streams.size) {
                this.sessionStreams.set(sessionId, alive);
            }
        }
    }
    saveSessions() {
        try {
            const file = this.sessionsFile();
            mkdirSync(path.dirname(file), { recursive: true });
            const sessions = Array.from(this.sessions.values())
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(0, MAX_SESSIONS)
                .map((session) => ({
                ...session,
                messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
            }));
            writeFileSync(file, JSON.stringify({ version: 1, projectRoot: this.projectRoot, sessions }, null, 2));
        }
        catch {
            // Persistence is best-effort; the daemon should keep serving live sessions.
        }
    }
    setProjectRoot(root) {
        if (!root)
            return;
        const next = path.resolve(root);
        if (next === this.projectRoot)
            return;
        this.projectRoot = next;
        this.sessions.clear();
        this.loadSessions();
    }
    loadSessions() {
        const file = this.sessionsFile();
        if (!existsSync(file))
            return;
        try {
            const payload = JSON.parse(readFileSync(file, 'utf8'));
            if (!Array.isArray(payload.sessions))
                return;
            for (const item of payload.sessions) {
                if (!isSession(item))
                    continue;
                this.sessions.set(item.id, item);
            }
        }
        catch {
            this.sessions.clear();
        }
    }
    sessionsFile() {
        return path.join(this.projectRoot, PROJECT_STATE_DIR, SESSIONS_FILE);
    }
}
const state = new ServerState();
export async function startServer(options = {}) {
    const host = options.host ?? '127.0.0.1';
    const port = options.port ?? DEFAULT_DAEMON_PORT;
    const server = createServer(async (req, res) => {
        try {
            await route(req, res);
        }
        catch (err) {
            sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => resolve());
    });
    process.stdout.write(`ai-inspect daemon listening at http://${host}:${port}\n`);
    await new Promise((resolve) => {
        let closing = false;
        const close = () => {
            if (closing)
                return;
            closing = true;
            server.close(() => resolve());
        };
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
export async function postMessage(content, role = 'assistant', daemonUrl = DEFAULT_DAEMON_URL, options = {}) {
    const parsed = parseDaemonUrl(daemonUrl);
    const resp = await fetch(`${parsed}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, content, mode: options.mode }),
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
export async function readSelectionSource(selection, contextLines) {
    const root = selection.source.root;
    const file = selection.source.file;
    if (!root || !file)
        throw new Error('selection has no source file');
    const resolvedRoot = path.resolve(root);
    const resolvedFile = path.isAbsolute(file) ? path.resolve(file) : path.resolve(resolvedRoot, file);
    const rel = path.relative(resolvedRoot, resolvedFile);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`source file is outside root: ${file}`);
    }
    let raw;
    try {
        raw = await readFile(resolvedFile, 'utf8');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`failed to read source file ${resolvedFile}: ${message}`);
    }
    const lines = raw.split(/\r?\n/);
    const requestedLine = selection.source.line ?? 1;
    const center = Math.min(Math.max(1, requestedLine), lines.length);
    const startLine = Math.max(1, center - contextLines);
    const endLine = Math.min(lines.length, center + contextLines);
    const content = lines
        .slice(startLine - 1, endLine)
        .map((line, index) => `${String(startLine + index).padStart(5, ' ')}  ${line}`)
        .join('\n');
    return {
        file: rel,
        root: resolvedRoot,
        startLine,
        endLine,
        totalLines: lines.length,
        content,
    };
}
async function route(req, res) {
    if (req.method === 'OPTIONS') {
        applyCors(req, res);
        res.writeHead(204);
        res.end();
        return;
    }
    applyCors(req, res);
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { ok: true, name: 'ai-inspect', version: VERSION });
        return;
    }
    if (req.method === 'GET' && url.pathname === '/selection') {
        sendJson(res, 200, selectionResponse());
        return;
    }
    if (req.method === 'GET' && url.pathname === '/sessions') {
        sendJson(res, 200, { sessions: Array.from(state.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt) });
        return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/sessions/') && url.pathname.endsWith('/events')) {
        const sessionId = decodeURIComponent(url.pathname.slice('/sessions/'.length, -'/events'.length));
        const session = state.sessions.get(sessionId);
        if (!session) {
            sendJson(res, 404, { error: 'session not found' });
            return;
        }
        openSessionStream(req, res, sessionId, session);
        return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/sessions/')) {
        const sessionId = decodeURIComponent(url.pathname.slice('/sessions/'.length));
        const session = state.sessions.get(sessionId);
        if (!session) {
            sendJson(res, 404, { error: 'session not found' });
            return;
        }
        sendJson(res, 200, { session });
        return;
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/sessions/')) {
        if (!isLocalOrigin(req.headers.origin)) {
            sendJson(res, 403, { error: 'origin rejected' });
            return;
        }
        const sessionId = decodeURIComponent(url.pathname.slice('/sessions/'.length));
        const existed = state.sessions.delete(sessionId);
        if (state.currentSelection?.sessionId === sessionId) {
            state.currentSelection = null;
            state.currentSelectionReceivedAt = 0;
        }
        const streams = state.sessionStreams.get(sessionId);
        if (streams) {
            for (const stream of streams) {
                if (!stream.destroyed)
                    stream.end();
            }
            state.sessionStreams.delete(sessionId);
        }
        state.saveSessions();
        sendJson(res, 200, { ok: true, deleted: existed });
        return;
    }
    if (req.method === 'POST' && url.pathname === '/messages') {
        if (!isLocalOrigin(req.headers.origin)) {
            sendJson(res, 403, { error: 'origin rejected' });
            return;
        }
        const body = await readJson(req);
        const content = body && typeof body === 'object' && typeof body.content === 'string'
            ? body.content.trim()
            : '';
        if (!content) {
            sendJson(res, 400, { error: 'content is required' });
            return;
        }
        const roleValue = body && typeof body === 'object' ? body.role : null;
        const role = roleValue === 'user' ? 'user' : 'assistant';
        const modeValue = body && typeof body === 'object' ? body.mode : null;
        const mode = modeValue === 'append' ? 'append' : 'create';
        const sessionId = state.currentSelection?.sessionId;
        if (!sessionId) {
            sendJson(res, 409, { error: 'no active session' });
            return;
        }
        const message = mode === 'append' && role === 'assistant'
            ? appendAssistantMessage(sessionId, content, state.currentSelection?.id ?? null)
            : appendMessage(sessionId, role, content, state.currentSelection?.id ?? null);
        emitSession(sessionId);
        sendJson(res, 200, { ok: true, message, session: state.sessions.get(sessionId) ?? null });
        return;
    }
    if (req.method === 'POST' && url.pathname === '/selection/clear') {
        state.currentSelection = null;
        state.currentSelectionReceivedAt = 0;
        sendJson(res, 200, { ok: true });
        return;
    }
    if (req.method === 'POST' && url.pathname === '/selection') {
        if (!isLocalOrigin(req.headers.origin)) {
            sendJson(res, 403, { error: 'origin rejected' });
            return;
        }
        const body = await readJson(req);
        const selection = normalizeSelection(body);
        state.setProjectRoot(selection.source.root);
        state.currentSelection = selection;
        state.currentSelectionReceivedAt = Date.now();
        upsertSessionFromSelection(state.currentSelection);
        emitSession(state.currentSelection.sessionId);
        sendJson(res, 200, { ok: true, selection: state.currentSelection });
        return;
    }
    sendJson(res, 404, { error: 'not found' });
}
function openSessionStream(req, res, sessionId, session) {
    res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
    });
    res.write(': connected\n\n');
    let streams = state.sessionStreams.get(sessionId);
    if (!streams) {
        streams = new Set();
        state.sessionStreams.set(sessionId, streams);
    }
    streams.add(res);
    writeSse(res, 'session', session);
    const heartbeat = setInterval(() => {
        if (!res.destroyed)
            res.write(': heartbeat\n\n');
    }, 25000);
    req.on('close', () => {
        clearInterval(heartbeat);
        streams?.delete(res);
        if (streams && streams.size === 0)
            state.sessionStreams.delete(sessionId);
    });
}
function emitSession(sessionId) {
    const session = state.sessions.get(sessionId);
    const streams = state.sessionStreams.get(sessionId);
    if (!session || !streams)
        return;
    for (const res of Array.from(streams)) {
        if (res.destroyed) {
            streams.delete(res);
            continue;
        }
        writeSse(res, 'session', session);
    }
    if (streams.size === 0)
        state.sessionStreams.delete(sessionId);
}
function writeSse(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}
function selectionResponse() {
    if (!state.currentSelection)
        return { active: false, selection: null, session: null, ageMs: null };
    const ageMs = Date.now() - state.currentSelectionReceivedAt;
    if (ageMs > SELECTION_TTL_MS) {
        state.currentSelection = null;
        state.currentSelectionReceivedAt = 0;
        return { active: false, selection: null, session: null, ageMs: null };
    }
    return { active: true, selection: state.currentSelection, session: state.sessions.get(state.currentSelection.sessionId) ?? null, ageMs };
}
function isSession(value) {
    if (!isRecord(value))
        return false;
    if (typeof value.id !== 'string')
        return false;
    if (typeof value.createdAt !== 'number' || typeof value.updatedAt !== 'number')
        return false;
    if (!Array.isArray(value.messages))
        return false;
    return value.selection === null || isRecord(value.selection);
}
function normalizeSelection(value) {
    if (!value || typeof value !== 'object')
        throw new Error('selection object required');
    const input = value;
    if (!input.dom || !input.source)
        throw new Error('invalid selection payload');
    return {
        id: stringOr(input.id, `selection-${Date.now()}`),
        sessionId: stringOr(input.sessionId, `session-${Date.now()}`),
        url: stringOr(input.url, ''),
        title: stringOr(input.title, ''),
        timestamp: numberOr(input.timestamp, Date.now()),
        instruction: stringOr(input.instruction, ''),
        framework: input.framework === 'vue3' ? 'vue3' : 'dom',
        dom: input.dom,
        vue: input.vue ?? null,
        source: input.source,
    };
}
function upsertSessionFromSelection(selection) {
    const now = Date.now();
    const existing = state.sessions.get(selection.sessionId);
    const message = createMessage(selection.sessionId, 'user', selection.instruction, selection.id);
    if (existing) {
        existing.selection = selection;
        existing.updatedAt = now;
        if (selection.instruction)
            existing.messages.push(message);
        state.saveSessions();
        return;
    }
    state.sessions.set(selection.sessionId, {
        id: selection.sessionId,
        createdAt: now,
        updatedAt: now,
        selection,
        messages: selection.instruction ? [message] : [],
    });
    state.saveSessions();
}
function appendMessage(sessionId, role, content, selectionId) {
    const now = Date.now();
    const session = state.sessions.get(sessionId);
    if (!session)
        throw new Error(`session not found: ${sessionId}`);
    const message = createMessage(sessionId, role, content, selectionId);
    session.messages.push(message);
    session.updatedAt = now;
    state.saveSessions();
    return message;
}
function appendAssistantMessage(sessionId, content, selectionId) {
    const now = Date.now();
    const session = state.sessions.get(sessionId);
    if (!session)
        throw new Error(`session not found: ${sessionId}`);
    const last = session.messages[session.messages.length - 1];
    if (last && last.role === 'assistant') {
        last.content += content;
        last.timestamp = now;
        session.updatedAt = now;
        state.saveSessions();
        return last;
    }
    const message = createMessage(sessionId, 'assistant', content, selectionId);
    session.messages.push(message);
    session.updatedAt = now;
    state.saveSessions();
    return message;
}
function createMessage(sessionId, role, content, selectionId) {
    return {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId,
        role,
        content,
        timestamp: Date.now(),
        selectionId,
    };
}
async function readJson(req) {
    const chunks = [];
    for await (const chunk of req)
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const text = Buffer.concat(chunks).toString('utf8');
    return text ? JSON.parse(text) : null;
}
function sendJson(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body, null, 2));
}
function applyCors(req, res) {
    const origin = req.headers.origin;
    if (isLocalOrigin(origin)) {
        res.setHeader('access-control-allow-origin', origin ?? '*');
        res.setHeader('vary', 'origin');
    }
    res.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
}
function isLocalOrigin(origin) {
    if (!origin)
        return true;
    try {
        const url = new URL(origin);
        return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
    }
    catch {
        return false;
    }
}
function parseDaemonUrl(daemonUrl) {
    const parsed = trimUrl(daemonUrl);
    try {
        const url = new URL(parsed);
        if (url.protocol !== 'http:') {
            throw new Error(`Invalid daemon URL protocol: ${url.protocol}. Only http:// is supported.`);
        }
        return parsed;
    }
    catch (err) {
        throw new Error(`Invalid daemon URL: ${daemonUrl}`);
    }
}
export { delay } from './utils.js';
//# sourceMappingURL=index.js.map