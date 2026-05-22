import type { IncomingMessage, ServerResponse } from 'node:http';
import { ServerState } from './state.js';
export declare function route(req: IncomingMessage, res: ServerResponse, state: ServerState, closeServer: () => void): Promise<void>;
