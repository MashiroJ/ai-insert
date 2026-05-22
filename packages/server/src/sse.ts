import type { ServerResponse } from 'node:http';
import type { UiInspectSession } from '@ui-inspect/protocol';
import { ServerState } from './state.js';

export function openSessionStream(
  req: import('node:http').IncomingMessage,
  res: ServerResponse,
  sessionId: string,
  session: UiInspectSession,
  state: ServerState,
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

export function emitSession(sessionId: string, state: ServerState): void {
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

export function writeSse(res: ServerResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
