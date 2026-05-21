import {
  DEFAULT_DAEMON_PORT,
  DEFAULT_DAEMON_URL,
  type UiInspectHealthResponse,
  type UiInspectMessage,
  type UiInspectMessageRole,
  type UiInspectSelection,
  type UiInspectSelectionResponse,
  type UiInspectSession,
  type UiInspectSessionsResponse,
  type UiInspectSourceResponse,
  type UiInspectTarget,
  type UiInspectTaskStatus,
} from '@mashiro39/ui-inspect-protocol';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { delay, isRecord, numberOr, stringOr, trimUrl } from './utils.js';

const VERSION = '0.3.2';
const SELECTION_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_SESSIONS = 100;
const MAX_MESSAGES_PER_SESSION = 200;
const PROJECT_STATE_DIR = '.ui-inspect';
const SESSIONS_FILE = 'sessions.json';

class ServerState {
  currentSelection: UiInspectSelection | null = null;
  currentSelectionReceivedAt = 0;
  projectRoot = path.resolve(process.env.UI_INSPECT_PROJECT || process.cwd());
  sessions = new Map<string, UiInspectSession>();
  sessionStreams = new Map<string, Set<ServerResponse>>();

  constructor() {
    this.loadSessions();
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    const timer = setInterval(() => {
      this.cleanupDeadStreams();
    }, CLEANUP_INTERVAL_MS);
    timer.unref?.();
  }

  cleanupDeadStreams(): void {
    for (const [sessionId, streams] of this.sessionStreams.entries()) {
      const alive = new Set<ServerResponse>();
      for (const res of streams) {
        if (!res.destroyed) {
          alive.add(res);
        }
      }
      if (alive.size === 0) {
        this.sessionStreams.delete(sessionId);
      } else if (alive.size !== streams.size) {
        this.sessionStreams.set(sessionId, alive);
      }
    }
  }

  saveSessions(): void {
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
    } catch {
      // Persistence is best-effort; the daemon should keep serving live sessions.
    }
  }

  setProjectRoot(root: string | null | undefined): void {
    if (!root) return;
    const next = path.resolve(root);
    if (next === this.projectRoot) return;
    this.projectRoot = next;
    this.sessions.clear();
    this.loadSessions();
  }

  private loadSessions(): void {
    const file = this.sessionsFile();
    if (!existsSync(file)) return;
    try {
      const payload = JSON.parse(readFileSync(file, 'utf8')) as { sessions?: unknown };
      if (!Array.isArray(payload.sessions)) return;
      for (const item of payload.sessions) {
        if (!isSession(item)) continue;
        this.sessions.set(item.id, item);
      }
    } catch {
      this.sessions.clear();
    }
  }

  private sessionsFile(): string {
    return path.join(this.projectRoot, PROJECT_STATE_DIR, SESSIONS_FILE);
  }
}

const state = new ServerState();

export interface StartServerOptions {
  host?: string;
  port?: number;
}

export async function startServer(options: StartServerOptions = {}): Promise<void> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? DEFAULT_DAEMON_PORT;
  let closing = false;
  let server: HttpServer;
  const close = () => {
    if (closing) return;
    closing = true;
    server.close(() => resolveClose());
  };
  let resolveClose: () => void = () => {};
  server = createServer(async (req, res) => {
    try {
      await route(req, res, close);
    } catch (err) {
      sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  process.stdout.write(`ui-inspect daemon listening at http://${host}:${port}\n`);

  await new Promise<void>((resolve) => {
    resolveClose = resolve;
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  });
}

export async function fetchSelection(daemonUrl = DEFAULT_DAEMON_URL): Promise<UiInspectSelectionResponse> {
  const parsed = parseDaemonUrl(daemonUrl);
  const resp = await fetch(`${parsed}/selection`);
  if (!resp.ok) throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
  return (await resp.json()) as UiInspectSelectionResponse;
}

export async function fetchSessions(daemonUrl = DEFAULT_DAEMON_URL): Promise<UiInspectSessionsResponse> {
  const parsed = parseDaemonUrl(daemonUrl);
  const resp = await fetch(`${parsed}/sessions`);
  if (!resp.ok) throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
  return (await resp.json()) as UiInspectSessionsResponse;
}

export async function postMessage(
  content: string,
  role: UiInspectMessageRole = 'assistant',
  daemonUrl = DEFAULT_DAEMON_URL,
  options: { mode?: 'append' } = {},
): Promise<UiInspectMessage> {
  const parsed = parseDaemonUrl(daemonUrl);
  const resp = await fetch(`${parsed}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role, content, mode: options.mode }),
  });
  if (!resp.ok) throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
  const payload = (await resp.json()) as { message: UiInspectMessage };
  return payload.message;
}

export async function clearSelection(daemonUrl = DEFAULT_DAEMON_URL): Promise<void> {
  const parsed = parseDaemonUrl(daemonUrl);
  const resp = await fetch(`${parsed}/selection/clear`, { method: 'POST' });
  if (!resp.ok) throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
}

export async function fetchHealth(daemonUrl = DEFAULT_DAEMON_URL): Promise<UiInspectHealthResponse> {
  const parsed = parseDaemonUrl(daemonUrl);
  const resp = await fetch(`${parsed}/health`);
  if (!resp.ok) throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
  return (await resp.json()) as UiInspectHealthResponse;
}

export async function shutdownDaemon(daemonUrl = DEFAULT_DAEMON_URL): Promise<void> {
  const parsed = parseDaemonUrl(daemonUrl);
  const resp = await fetch(`${parsed}/shutdown`, { method: 'POST' });
  if (!resp.ok) throw new Error(`daemon ${resp.status}: ${await resp.text()}`);
}

export async function readSelectionSource(
  selection: UiInspectSelection,
  contextLines: number,
): Promise<UiInspectSourceResponse> {
  const root = selection.source.root;
  const file = selection.source.file;
  if (!root || !file) throw new Error('selection has no source file');

  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.isAbsolute(file) ? path.resolve(file) : path.resolve(resolvedRoot, file);
  const rel = path.relative(resolvedRoot, resolvedFile);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`source file is outside root: ${file}`);
  }

  let raw: string;
  try {
    raw = await readFile(resolvedFile, 'utf8');
  } catch (err) {
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

async function route(req: IncomingMessage, res: ServerResponse, closeServer: () => void): Promise<void> {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.writeHead(204);
    res.end();
    return;
  }

  applyCors(req, res);
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, name: 'ui-inspect', version: VERSION } satisfies UiInspectHealthResponse);
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
    sendJson(res, 200, selectionResponse());
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
    const status = normalizeTaskStatus(isRecord(body) ? body.status : null);
    session.status = status;
    session.updatedAt = Date.now();
    state.saveSessions();
    emitSession(sessionId);
    sendJson(res, 200, { ok: true, session });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/open-source') {
    if (!isLocalOrigin(req.headers.origin)) {
      sendJson(res, 403, { error: 'origin rejected' });
      return;
    }
    const body = await readJson(req);
    const source = isRecord(body) && isRecord(body.source) ? body.source : body;
    const result = openSource(source);
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

function openSessionStream(
  req: IncomingMessage,
  res: ServerResponse,
  sessionId: string,
  session: UiInspectSession,
): void {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.write(': connected\n\n');
  let streams = state.sessionStreams.get(sessionId);
  if (!streams) {
    streams = new Set<ServerResponse>();
    state.sessionStreams.set(sessionId, streams);
  }
  streams.add(res);
  writeSse(res, 'session', session);

  const heartbeat = setInterval(() => {
    if (!res.destroyed) res.write(': heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    streams?.delete(res);
    if (streams && streams.size === 0) state.sessionStreams.delete(sessionId);
  });
}

function emitSession(sessionId: string): void {
  const session = state.sessions.get(sessionId);
  const streams = state.sessionStreams.get(sessionId);
  if (!session || !streams) return;
  for (const res of Array.from(streams)) {
    if (res.destroyed) {
      streams.delete(res);
      continue;
    }
    writeSse(res, 'session', session);
  }
  if (streams.size === 0) state.sessionStreams.delete(sessionId);
}

function writeSse(res: ServerResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function selectionResponse(): UiInspectSelectionResponse {
  if (!state.currentSelection) return { active: false, selection: null, session: null, ageMs: null };
  const ageMs = Date.now() - state.currentSelectionReceivedAt;
  if (ageMs > SELECTION_TTL_MS) {
    state.currentSelection = null;
    state.currentSelectionReceivedAt = 0;
    return { active: false, selection: null, session: null, ageMs: null };
  }
  return { active: true, selection: state.currentSelection, session: state.sessions.get(state.currentSelection.sessionId) ?? null, ageMs };
}

function isSession(value: unknown): value is UiInspectSession {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.createdAt !== 'number' || typeof value.updatedAt !== 'number') return false;
  if (!Array.isArray(value.messages)) return false;
  return value.selection === null || isRecord(value.selection);
}

function normalizeSelection(value: unknown): UiInspectSelection {
  if (!value || typeof value !== 'object') throw new Error('selection object required');
  const input = value as Partial<UiInspectSelection>;
  if (!input.dom || !input.source) throw new Error('invalid selection payload');
  return {
    id: stringOr(input.id, `selection-${Date.now()}`),
    sessionId: stringOr(input.sessionId, `session-${Date.now()}`),
    url: stringOr(input.url, ''),
    title: stringOr(input.title, ''),
    timestamp: numberOr(input.timestamp, Date.now()),
    instruction: stringOr(input.instruction, ''),
    note: typeof input.note === 'string' ? input.note : undefined,
    framework: input.framework === 'vue3' ? 'vue3' : 'dom',
    dom: input.dom,
    vue: input.vue ?? null,
    source: input.source,
  };
}

function upsertSessionFromSelection(selection: UiInspectSelection): void {
  const now = Date.now();
  const existing = state.sessions.get(selection.sessionId);
  const message = createMessage(selection.sessionId, 'user', selection.instruction, selection.id);
  const targets = normalizeTargets((selection as unknown as { targets?: unknown }).targets, selection);
  if (existing) {
    existing.selection = selection;
    existing.targets = targets;
    existing.status = 'sent';
    existing.updatedAt = now;
    if (selection.instruction) existing.messages.push(message);
    state.saveSessions();
    return;
  }
  state.sessions.set(selection.sessionId, {
    id: selection.sessionId,
    createdAt: now,
    updatedAt: now,
    status: 'sent',
    selection,
    targets,
    messages: selection.instruction ? [message] : [],
  });
  state.saveSessions();
}

function normalizeTargets(value: unknown, fallback: UiInspectSelection): UiInspectTarget[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{
      id: fallback.id,
      note: typeof fallback.note === 'string' ? fallback.note : '',
      selection: fallback,
    }];
  }
  return value.slice(0, 20).map((item, index) => {
    const input = isRecord(item) ? item : {};
    const rawSelection = isRecord(input.selection) ? input.selection : fallback;
    const selection = normalizeSelection(rawSelection);
    return {
      id: stringOr(input.id, selection.id || `target-${Date.now()}-${index}`),
      note: stringOr(input.note, stringOr(selection.note, '')),
      selection,
    };
  });
}

function normalizeTaskStatus(value: unknown): UiInspectTaskStatus {
  return value === 'draft' || value === 'sent' || value === 'claimed' || value === 'working' || value === 'done' || value === 'failed'
    ? value
    : 'working';
}

function appendMessage(
  sessionId: string,
  role: UiInspectMessageRole,
  content: string,
  selectionId: string | null,
): UiInspectMessage {
  const now = Date.now();
  const session = state.sessions.get(sessionId);
  if (!session) throw new Error(`session not found: ${sessionId}`);
  const message = createMessage(sessionId, role, content, selectionId);
  session.messages.push(message);
  session.updatedAt = now;
  state.saveSessions();
  return message;
}

function appendAssistantMessage(
  sessionId: string,
  content: string,
  selectionId: string | null,
): UiInspectMessage {
  const now = Date.now();
  const session = state.sessions.get(sessionId);
  if (!session) throw new Error(`session not found: ${sessionId}`);
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

function createMessage(
  sessionId: string,
  role: UiInspectMessageRole,
  content: string,
  selectionId: string | null,
): UiInspectMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    role,
    content,
    timestamp: Date.now(),
    selectionId,
  };
}

function openSource(value: unknown): { ok: boolean; editor?: string; command?: string; args?: string[]; file?: string; error?: string } {
  if (!isRecord(value)) return { ok: false, error: 'source object required' };
  const root = typeof value.root === 'string' ? value.root : state.projectRoot;
  const file = typeof value.file === 'string' ? value.file : '';
  if (!file) return { ok: false, error: 'source.file is required' };
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.isAbsolute(file) ? path.resolve(file) : path.resolve(resolvedRoot, file);
  const rel = path.relative(resolvedRoot, resolvedFile);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return { ok: false, error: `source file is outside root: ${file}` };
  if (!existsSync(resolvedFile)) return { ok: false, error: `source file not found: ${resolvedFile}` };

  const line = typeof value.line === 'number' && Number.isFinite(value.line) && value.line > 0 ? Math.floor(value.line) : 1;
  const column = typeof value.column === 'number' && Number.isFinite(value.column) && value.column > 0 ? Math.floor(value.column) : 1;
  const editor = detectEditor();
  const target = `${resolvedFile}:${line}:${column}`;
  const args = editor === 'open'
    ? [resolvedFile]
    : ['-g', target];
  try {
    const child = spawn(editor, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return { ok: true, editor, command: editor, args, file: resolvedFile };
  } catch (err) {
    return { ok: false, editor, command: editor, args, file: resolvedFile, error: err instanceof Error ? err.message : String(err) };
  }
}

function detectEditor(): string {
  const preferred = process.env.UI_INSPECT_EDITOR;
  if (preferred && commandExists(preferred)) return preferred;
  for (const command of ['code', 'cursor', 'webstorm']) {
    if (commandExists(command)) return command;
  }
  return process.platform === 'darwin' ? 'open' : 'code';
}

function commandExists(command: string): boolean {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : null;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
}

function applyCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (isLocalOrigin(origin)) {
    res.setHeader('access-control-allow-origin', origin ?? '*');
    res.setHeader('vary', 'origin');
  }
  res.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-allow-private-network', 'true');
}

function isLocalOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return isLocalHostname(url.hostname);
  } catch {
    return false;
  }
}

function isLocalHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [first, second] = parts;
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function parseDaemonUrl(daemonUrl: string): string {
  const parsed = trimUrl(daemonUrl);
  try {
    const url = new URL(parsed);
    if (url.protocol !== 'http:') {
      throw new Error(`Invalid daemon URL protocol: ${url.protocol}. Only http:// is supported.`);
    }
    return parsed;
  } catch (err) {
    throw new Error(`Invalid daemon URL: ${daemonUrl}`);
  }
}

export { delay } from './utils.js';
