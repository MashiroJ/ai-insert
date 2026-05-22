import { sendJson, readJson, isLocalOrigin, applyCors } from './http.js';
import { emitSession } from './sse.js';
import { selectionResponse, normalizeSelection, normalizeTargets, normalizeDiagnostics, normalizeSessionMode, normalizeTaskStatus, upsertSessionFromSelection, appendMessage, appendAssistantMessage, } from './sessions.js';
import { detectEditors, detectEditor } from './editors.js';
import { openSource } from './source.js';
import { getVersion } from './version.js';
export async function route(req, res, state, closeServer) {
    if (req.method === 'OPTIONS') {
        applyCors(req, res);
        res.writeHead(204);
        res.end();
        return;
    }
    applyCors(req, res);
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { ok: true, name: 'ui-inspect', version: getVersion() });
        return;
    }
    if (req.method === 'GET' && url.pathname === '/editors') {
        sendJson(res, 200, { ok: true, editors: detectEditors(), preferred: detectEditor() });
        return;
    }
    if (req.method === 'POST' && url.pathname === '/shutdown') {
        if (!isLocalOrigin(req.headers.origin)) {
            sendJson(res, 403, { error: 'origin rejected' });
            return;
        }
        sendJson(res, 200, { ok: true });
        setTimeout(() => {
            closeServer();
            process.exit(0);
        }, 50).unref?.();
        return;
    }
    if (req.method === 'GET' && url.pathname === '/selection') {
        sendJson(res, 200, selectionResponse(state));
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
        const { openSessionStream } = await import('./sse.js');
        openSessionStream(req, res, sessionId, session, state);
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
            ? appendAssistantMessage(sessionId, content, state.currentSelection?.id ?? null, state)
            : appendMessage(sessionId, role, content, state.currentSelection?.id ?? null, state);
        emitSession(sessionId, state);
        sendJson(res, 200, { ok: true, message, session: state.sessions.get(sessionId) ?? null });
        return;
    }
    if (req.method === 'POST' && url.pathname.startsWith('/sessions/') && url.pathname.endsWith('/status')) {
        if (!isLocalOrigin(req.headers.origin)) {
            sendJson(res, 403, { error: 'origin rejected' });
            return;
        }
        const sessionId = decodeURIComponent(url.pathname.slice('/sessions/'.length, -'/status'.length));
        const session = state.sessions.get(sessionId);
        if (!session) {
            sendJson(res, 404, { error: 'session not found' });
            return;
        }
        const body = await readJson(req);
        const status = normalizeTaskStatus((body && typeof body === 'object' && body.status) ?? null);
        session.status = status;
        session.updatedAt = Date.now();
        state.saveSessions();
        emitSession(sessionId, state);
        sendJson(res, 200, { ok: true, session });
        return;
    }
    if (req.method === 'POST' && url.pathname === '/open-source') {
        if (!isLocalOrigin(req.headers.origin)) {
            sendJson(res, 403, { error: 'origin rejected' });
            return;
        }
        const body = await readJson(req);
        const source = body && typeof body === 'object' && body.source && typeof body.source === 'object'
            ? body.source
            : body;
        const editor = body && typeof body === 'object' && typeof body.editor === 'string'
            ? body.editor
            : undefined;
        const result = openSource(source, state.projectRoot, editor);
        sendJson(res, result.ok ? 200 : 400, result);
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
        const targets = normalizeTargets(body && typeof body === 'object' ? body.targets : undefined, selection);
        const mode = normalizeSessionMode(body && typeof body === 'object' ? body.mode : undefined);
        const diagnostics = normalizeDiagnostics(body && typeof body === 'object' ? body.diagnostics : undefined);
        state.setProjectRoot(selection.source.root);
        state.currentSelection = selection;
        state.currentSelectionReceivedAt = Date.now();
        upsertSessionFromSelection(state.currentSelection, state, targets, mode, diagnostics);
        emitSession(state.currentSelection.sessionId, state);
        sendJson(res, 200, { ok: true, selection: state.currentSelection });
        return;
    }
    sendJson(res, 404, { error: 'not found' });
}
//# sourceMappingURL=routes.js.map