import type { ServerResponse } from 'node:http';
import type { UiInspectSession } from '@ui-inspect/protocol';
import { ServerState } from './state.js';
export declare function openSessionStream(req: import('node:http').IncomingMessage, res: ServerResponse, sessionId: string, session: UiInspectSession, state: ServerState): void;
export declare function emitSession(sessionId: string, state: ServerState): void;
export declare function writeSse(res: ServerResponse, event: string, data: unknown): void;
