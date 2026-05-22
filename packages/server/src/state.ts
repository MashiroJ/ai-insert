import type { UiInspectSession } from '@ui-inspect/protocol';
import type { ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isRecord } from './utils.js';

export const SELECTION_TTL_MS = 10 * 60 * 1000;
export const CLEANUP_INTERVAL_MS = 60 * 1000;
export const MAX_SESSIONS = 100;
export const MAX_MESSAGES_PER_SESSION = 200;
export const PROJECT_STATE_DIR = '.ui-inspect';
export const SESSIONS_FILE = 'sessions.json';

export class ServerState {
  currentSelection: import('@ui-inspect/protocol').UiInspectSelection | null = null;
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

export function isSession(value: unknown): value is UiInspectSession {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.createdAt !== 'number' || typeof value.updatedAt !== 'number') return false;
  if (!Array.isArray(value.messages)) return false;
  return value.selection === null || isRecord(value.selection);
}
