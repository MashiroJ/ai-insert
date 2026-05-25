import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  UiInspectHealthResponse,
  UiInspectMessageRole,
  UiInspectSelectionResponse,
  UiInspectSessionsResponse,
} from '@ui-inspect/protocol';
import { ServerState } from './state.js';
import { sendJson, readJson, isLocalOrigin, applyCors } from './http.js';
import { emitSession } from './sse.js';
import {
  selectionResponse,
  normalizeSelection,
  normalizeTargets,
  normalizeDiagnostics,
  normalizeCssDebugPayload,
  normalizeSessionMode,
  normalizeTaskStatus,
  upsertSessionFromSelection,
  appendMessage,
  appendAssistantMessage,
} from './sessions.js';
import { detectEditors, detectEditor } from './editors.js';
import { openSource } from './source.js';
import { buildCssDebugStyleSourceHints } from './style-source-hints.js';
import { getVersion } from './version.js';

export async function route(
  req: IncomingMessage,
  res: ServerResponse,
  state: ServerState,
  closeServer: () => void,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.writeHead(204);
    res.end();
    return;
  }

  applyCors(req, res);
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, name: 'ui-inspect', version: getVersion() } satisfies UiInspectHealthResponse);
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
    sendJson(res, 200, { sessions: Array.from(state.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt) } satisfies UiInspectSessionsResponse);
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
        if (!stream.destroyed) stream.end();
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
    const content = body && typeof body === 'object' && typeof (body as { content?: unknown }).content === 'string'
      ? (body as { content: string }).content.trim()
      : '';
    if (!content) {
      sendJson(res, 400, { error: 'content is required' });
      return;
    }
    const roleValue = body && typeof body === 'object' ? (body as { role?: unknown }).role : null;
    const role: UiInspectMessageRole = roleValue === 'user' ? 'user' : 'assistant';
    const modeValue = body && typeof body === 'object' ? (body as { mode?: unknown }).mode : null;
    const mode = modeValue === 'append' ? 'append' : 'create';
    const sessionIdValue = body && typeof body === 'object' ? (body as { sessionId?: unknown }).sessionId : null;
    const sessionId = typeof sessionIdValue === 'string' && sessionIdValue.trim()
      ? sessionIdValue.trim()
      : state.currentSelection?.sessionId;
    if (!sessionId) {
      sendJson(res, 409, { error: 'no active session' });
      return;
    }
    const session = state.sessions.get(sessionId);
    if (!session) {
      sendJson(res, 404, { error: 'session not found' });
      return;
    }
    const selectionId = state.currentSelection?.sessionId === sessionId
      ? state.currentSelection?.id ?? session.selection?.id ?? null
      : session.selection?.id ?? null;
    const message = mode === 'append' && role === 'assistant'
      ? appendAssistantMessage(sessionId, content, selectionId, state)
      : appendMessage(sessionId, role, content, selectionId, state);
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
    const status = normalizeTaskStatus((body && typeof body === 'object' && (body as Record<string, unknown>).status) ?? null);
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
    const source = body && typeof body === 'object' && (body as Record<string, unknown>).source && typeof (body as Record<string, unknown>).source === 'object'
      ? (body as Record<string, unknown>).source
      : body;
    const editor = body && typeof body === 'object' && typeof (body as Record<string, unknown>).editor === 'string'
      ? (body as Record<string, unknown>).editor as string
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
    const raw = body && typeof body === 'object' ? body as Record<string, unknown> : undefined;
    const selection = normalizeSelection(body);
    const hasBodyTargets = Array.isArray(raw?.targets) && (raw.targets as unknown[]).length > 0;
    const bodyTargets = hasBodyTargets ? normalizeTargets(raw.targets, selection) : undefined;
    const mode = normalizeSessionMode(raw?.mode);
    const diagnostics = normalizeDiagnostics(raw?.diagnostics);
    const cssDebug = normalizeCssDebugPayload(raw?.cssDebug, selection);
    if (mode === 'css-debug' && cssDebug) {
      try {
        const hintRoot = selection.source.root || state.projectRoot;
        const enriched = buildCssDebugStyleSourceHints({
          projectRoot: hintRoot,
          cssDebug,
        });
        Object.assign(cssDebug, enriched);
      } catch {
        // Hint building is best-effort; never fail task creation.
      }
    }
    const cssDebugTargets = Array.isArray(cssDebug?.targets) && cssDebug.targets.length > 0
      ? normalizeTargets(cssDebug.targets.map((t) => ({ id: t.id, note: t.note ?? '', selection: t.selection ?? selection, cssDebug: t })), selection)
      : undefined;
    const targets = bodyTargets ?? cssDebugTargets ?? normalizeTargets(undefined, selection);
    state.setProjectRoot(selection.source.root);
    state.currentSelection = selection;
    state.currentSelectionReceivedAt = Date.now();
    upsertSessionFromSelection(state.currentSelection, state, targets, mode, diagnostics, cssDebug);
    emitSession(state.currentSelection.sessionId, state);
    sendJson(res, 200, { ok: true, selection: state.currentSelection });
    return;
  }

  sendJson(res, 404, { error: 'not found' });
}
