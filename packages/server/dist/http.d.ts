import type { IncomingMessage, ServerResponse } from 'node:http';
export declare function sendJson(res: ServerResponse, status: number, data: unknown): void;
export declare function readJson(req: IncomingMessage): Promise<unknown>;
export declare function applyCors(req: IncomingMessage, res: ServerResponse): void;
export declare function isLocalOrigin(origin: string | undefined): boolean;
export declare function parseDaemonUrl(daemonUrl: string): string;
