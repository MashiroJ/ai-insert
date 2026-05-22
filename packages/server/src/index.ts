import {
  DEFAULT_DAEMON_PORT,
  DEFAULT_DAEMON_URL,
  type UiInspectHealthResponse,
  type UiInspectMessage,
  type UiInspectMessageRole,
  type UiInspectSelection,
  type UiInspectSelectionResponse,
  type UiInspectSessionsResponse,
  type UiInspectSourceResponse,
} from '@ui-inspect/protocol';
import { createServer } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import { ServerState } from './state.js';
import { route } from './routes.js';
import { sendJson } from './http.js';
import { parseDaemonUrl } from './http.js';
import { readSelectionSource } from './source.js';

export type { StartServerOptions } from './types.js';
export { readSelectionSource } from './source.js';
export { delay } from './utils.js';
export { getVersion } from './version.js';

const state = new ServerState();

export async function startServer(options: { host?: string; port?: number } = {}): Promise<void> {
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
      await route(req, res, state, close);
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
