import type {
  UiInspectDiagnostics,
  UiInspectMessage,
  UiInspectMessageRole,
  UiInspectSelection,
  UiInspectSession,
  UiInspectSessionMode,
  UiInspectTarget,
  UiInspectTaskStatus,
} from '@ui-inspect/protocol';
import { isRecord, numberOr, stringOr } from './utils.js';
import { ServerState, SELECTION_TTL_MS, MAX_SESSIONS, MAX_MESSAGES_PER_SESSION } from './state.js';

export function selectionResponse(state: ServerState): import('@ui-inspect/protocol').UiInspectSelectionResponse {
  if (!state.currentSelection) return { active: false, selection: null, session: null, ageMs: null };
  const ageMs = Date.now() - state.currentSelectionReceivedAt;
  if (ageMs > SELECTION_TTL_MS) {
    state.currentSelection = null;
    state.currentSelectionReceivedAt = 0;
    return { active: false, selection: null, session: null, ageMs: null };
  }
  return { active: true, selection: state.currentSelection, session: state.sessions.get(state.currentSelection.sessionId) ?? null, ageMs };
}

export function normalizeSelection(value: unknown): UiInspectSelection {
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
    context: isRecord(input.context) ? input.context : undefined,
    sourceHints: Array.isArray(input.sourceHints) ? input.sourceHints : undefined,
    diagnostics: isRecord(input.diagnostics) ? input.diagnostics : undefined,
  };
}

export function upsertSessionFromSelection(
  selection: UiInspectSelection,
  state: ServerState,
  incomingTargets?: UiInspectTarget[],
  mode?: UiInspectSessionMode,
  diagnostics?: UiInspectDiagnostics,
): void {
  const now = Date.now();
  const existing = state.sessions.get(selection.sessionId);
  const message = createMessage(selection.sessionId, 'user', selection.instruction, selection.id);
  const targets = incomingTargets?.length ? incomingTargets : normalizeTargets(undefined, selection);
  if (existing) {
    existing.selection = selection;
    existing.targets = targets;
    if (mode) existing.mode = mode;
    if (diagnostics) existing.diagnostics = diagnostics;
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
    mode,
    selection,
    targets,
    diagnostics,
    messages: selection.instruction ? [message] : [],
  });
  state.saveSessions();
}

export function normalizeTargets(value: unknown, fallback: UiInspectSelection): UiInspectTarget[] {
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
      context: isRecord(input.context) ? input.context : selection.context,
      sourceHints: Array.isArray(input.sourceHints) ? input.sourceHints : selection.sourceHints,
      diagnostics: normalizeDiagnostics(input.diagnostics) || selection.diagnostics,
    };
  });
}

export function normalizeDiagnostics(value: unknown): UiInspectDiagnostics | undefined {
  if (!isRecord(value) || !Array.isArray(value.runtimeEvents)) return undefined;
  return {
    runtimeEvents: value.runtimeEvents as UiInspectDiagnostics['runtimeEvents'],
    capturedAt: numberOr(value.capturedAt, Date.now()),
    truncated: typeof value.truncated === 'boolean' ? value.truncated : undefined,
  };
}

export function normalizeSessionMode(value: unknown): UiInspectSessionMode | undefined {
  return value === 'source' || value === 'single' || value === 'batch' || value === 'troubleshoot'
    ? value
    : undefined;
}

export function normalizeTaskStatus(value: unknown): UiInspectTaskStatus {
  return value === 'draft' || value === 'sent' || value === 'claimed' || value === 'working' || value === 'done' || value === 'failed'
    ? value
    : 'working';
}

export function appendMessage(
  sessionId: string,
  role: UiInspectMessageRole,
  content: string,
  selectionId: string | null,
  state: ServerState,
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

export function appendAssistantMessage(
  sessionId: string,
  content: string,
  selectionId: string | null,
  state: ServerState,
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

export function createMessage(
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
