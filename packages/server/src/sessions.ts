import type {
  UiInspectCssDebugInteraction,
  UiInspectCssDebugPayload,
  UiInspectCssDebugStyleChange,
  UiInspectCssDebugTarget,
  UiInspectDiagnostics,
  UiInspectDomSelection,
  UiInspectMessage,
  UiInspectMessageRole,
  UiInspectSelection,
  UiInspectSession,
  UiInspectSessionMode,
  UiInspectStyleSourceHint,
  UiInspectStyleSourceHintKind,
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
    framework: typeof input.framework === 'string' ? input.framework : 'dom',
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
  cssDebug?: UiInspectCssDebugPayload,
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
    if (cssDebug) {
      existing.cssDebug = cssDebug;
    } else {
      delete existing.cssDebug;
    }
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
    cssDebug,
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
  return value === 'source' || value === 'single' || value === 'batch' || value === 'troubleshoot' || value === 'css-debug'
    ? value
    : undefined;
}

export function normalizeCssDebugPayload(value: unknown, fallback: UiInspectSelection): UiInspectCssDebugPayload | undefined {
  if (!isRecord(value)) return undefined;
  const selection = isRecord(value.selection) ? normalizeSelection(value.selection) : fallback;
  const selectedElement = isRecord(value.selectedElement) ? value.selectedElement as unknown as UiInspectDomSelection : selection.dom;
  const batch = typeof value.batch === 'boolean' ? value.batch : undefined;
  const primaryTargetId = typeof value.primaryTargetId === 'string' ? value.primaryTargetId : undefined;
  const changedTargetCount = typeof value.changedTargetCount === 'number' ? value.changedTargetCount : undefined;
  const targets = normalizeCssDebugTargets(value.targets, fallback);
  return {
    selection,
    selectedElement,
    originalStyles: normalizeStyleRecord(value.originalStyles),
    previewStyles: normalizeStyleRecord(value.previewStyles),
    changedStyles: normalizeStyleChanges(value.changedStyles),
    ...(batch !== undefined ? { batch } : {}),
    ...(primaryTargetId !== undefined ? { primaryTargetId } : {}),
    ...(changedTargetCount !== undefined ? { changedTargetCount } : {}),
    ...(targets.length > 0 ? { targets } : {}),
    computedEffects: normalizeCssDebugComputedEffects(value.computedEffects),
    layoutContext: normalizeCssDebugLayoutContext(value.layoutContext),
    interactions: normalizeCssDebugInteractions(value.interactions),
    primaryInteraction: normalizeCssDebugInteraction(value.primaryInteraction),
    note: typeof value.note === 'string' ? value.note : selection.note,
    sourceHints: Array.isArray(value.sourceHints) ? value.sourceHints : selection.sourceHints,
    styleSourceHints: normalizeStyleSourceHints(value.styleSourceHints),
    scopeGuard: normalizeScopeGuard(value.scopeGuard),
    session: normalizeCssDebugSessionInfo(value.session, selection),
  };
}

function normalizeCssDebugTargets(value: unknown, fallback: UiInspectSelection): UiInspectCssDebugTarget[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item, index) => {
    const input = isRecord(item) ? item : {};
    const selection = isRecord(input.selection) ? normalizeSelection(input.selection) : fallback;
    const selectedElement = isRecord(input.selectedElement) ? input.selectedElement as unknown as UiInspectDomSelection : selection.dom;
    return {
      id: stringOr(input.id, `target-${Date.now()}-${index}`),
      selection,
      selectedElement,
      originalStyles: normalizeStyleRecord(input.originalStyles),
      originalInlineStyles: isRecord(input.originalInlineStyles) ? normalizeStyleRecord(input.originalInlineStyles) : undefined,
      previewStyles: normalizeStyleRecord(input.previewStyles),
      changedStyles: normalizeStyleChanges(input.changedStyles),
      computedEffects: normalizeCssDebugComputedEffects(input.computedEffects),
      layoutContext: normalizeCssDebugLayoutContext(input.layoutContext),
      interactions: normalizeCssDebugInteractions(input.interactions),
      primaryInteraction: normalizeCssDebugInteraction(input.primaryInteraction),
      note: typeof input.note === 'string' ? input.note : undefined,
      sourceHints: Array.isArray(input.sourceHints) ? input.sourceHints : undefined,
      styleSourceHints: normalizeStyleSourceHints(input.styleSourceHints),
      layoutHints: Array.isArray(input.layoutHints) ? input.layoutHints : undefined,
      specificityWarnings: Array.isArray(input.specificityWarnings) ? input.specificityWarnings : undefined,
      scopeGuard: normalizeScopeGuard(input.scopeGuard),
    };
  }).filter((target) =>
    Object.keys(target.changedStyles).length > 0 ||
    (target.primaryInteraction?.type === 'reorder') ||
    (target.primaryInteraction?.type === 'group-scale') ||
    (target.interactions?.some((i) => i.type === 'reorder' || i.type === 'group-scale')),
  );
}

function normalizeCssDebugSessionInfo(value: unknown, selection: UiInspectSelection): UiInspectCssDebugPayload['session'] {
  const input = isRecord(value) ? value : {};
  return {
    id: stringOr(input.id, selection.sessionId),
    url: stringOr(input.url, selection.url),
    title: stringOr(input.title, selection.title),
    root: typeof input.root === 'string' || input.root === null ? input.root : selection.source.root,
    timestamp: numberOr(input.timestamp, selection.timestamp),
  };
}

function normalizeStyleRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const styles: Record<string, string> = {};
  for (const [property, styleValue] of Object.entries(value)) {
    if (typeof styleValue === 'string') {
      styles[property] = styleValue;
    } else if (typeof styleValue === 'number' || typeof styleValue === 'boolean') {
      styles[property] = String(styleValue);
    }
  }
  return styles;
}

function normalizeStyleChanges(value: unknown): Record<string, UiInspectCssDebugStyleChange> {
  if (!isRecord(value)) return {};
  const changes: Record<string, UiInspectCssDebugStyleChange> = {};
  for (const [property, rawChange] of Object.entries(value)) {
    if (!isRecord(rawChange)) continue;
    changes[property] = {
      originalValue: stringOrNull(rawChange.originalValue ?? rawChange.from),
      previewValue: stringOrNull(rawChange.previewValue ?? rawChange.to),
    };
  }
  return changes;
}

function normalizeCssDebugComputedEffects(value: unknown): UiInspectCssDebugPayload['computedEffects'] {
  if (!isRecord(value)) return undefined;
  return {
    self: normalizeStyleChanges(value.self),
  };
}

function normalizeCssDebugLayoutContext(value: unknown): UiInspectCssDebugPayload['layoutContext'] {
  if (!isRecord(value)) return undefined;
  return {
    parent: normalizeElementSnapshot(value.parent),
    siblings: normalizeElementEffects(value.siblings),
    children: normalizeElementEffects(value.children),
  };
}

function normalizeElementSnapshot(value: unknown): NonNullable<UiInspectCssDebugPayload['layoutContext']>['parent'] {
  if (!isRecord(value)) return undefined;
  return {
    selector: stringOr(value.selector, ''),
    tagName: stringOr(value.tagName, ''),
    className: stringOr(value.className, ''),
    text: stringOr(value.text, ''),
    rect: normalizeRect(value.rect),
    styles: normalizeStyleRecord(value.styles),
  };
}

function normalizeElementEffects(value: unknown): NonNullable<UiInspectCssDebugPayload['layoutContext']>['siblings'] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item) => {
    const input = isRecord(item) ? item : {};
    return {
      selector: stringOr(input.selector, ''),
      tagName: stringOr(input.tagName, ''),
      className: stringOr(input.className, ''),
      text: stringOr(input.text, ''),
      beforeRect: normalizeRect(input.beforeRect),
      afterRect: normalizeRect(input.afterRect),
      sizeChanged: typeof input.sizeChanged === 'boolean' ? input.sizeChanged : rectSizeChanged(input.beforeRect, input.afterRect),
      positionChanged: typeof input.positionChanged === 'boolean' ? input.positionChanged : rectPositionChanged(input.beforeRect, input.afterRect),
    };
  });
}

function normalizeCssDebugInteractions(value: unknown): UiInspectCssDebugInteraction[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.slice(0, 20).map((item) => normalizeCssDebugInteraction(item)).filter((item): item is UiInspectCssDebugInteraction => !!item);
}

function normalizeCssDebugInteraction(value: unknown): UiInspectCssDebugInteraction | undefined {
  if (!isRecord(value)) return undefined;
  const validStrategies = ['transform-preview', 'inline-style', 'swap-sibling', 'group-scale'];
  const strategy = typeof value.strategy === 'string' && validStrategies.includes(value.strategy)
    ? value.strategy as UiInspectCssDebugInteraction['strategy']
    : 'inline-style';
  return {
    type: normalizeCssDebugInteractionType(value.type),
    handle: normalizeCssDebugInteractionHandle(value.handle),
    properties: normalizeCssDebugInteractionProperties(value.properties),
    rectBefore: normalizeRect(value.rectBefore),
    rectAfter: normalizeRect(value.rectAfter),
    delta: normalizeRect(value.delta),
    strategy,
    timestamp: numberOr(value.timestamp, Date.now()),
    clamped: typeof value.clamped === 'boolean' ? value.clamped : undefined,
    clampDelta: isRecord(value.clampDelta) ? normalizeRect(value.clampDelta) : undefined,
    scopeGuard: normalizeScopeGuard(value.scopeGuard),
    reorder: normalizeCssDebugReorder(value.reorder),
    groupScale: normalizeCssDebugGroupScale(value.groupScale),
  };
}

function normalizeCssDebugInteractionType(value: unknown): UiInspectCssDebugInteraction['type'] {
  return value === 'resize' || value === 'move' || value === 'reorder' || value === 'group-scale'
    ? value
    : 'panel-control';
}

function normalizeCssDebugReorder(value: unknown): UiInspectCssDebugInteraction['reorder'] {
  if (!isRecord(value)) return undefined;
  const parentSelector = typeof value.parentSelector === 'string' ? value.parentSelector : '';
  if (!parentSelector) return undefined;
  const matchedBy = Array.isArray(value.matchedBy)
    ? (value.matchedBy as unknown[]).filter((v): v is string => typeof v === 'string').slice(0, 8)
    : [];
  return {
    sourceId: typeof value.sourceId === 'string' ? value.sourceId : '',
    targetId: typeof value.targetId === 'string' ? value.targetId : '',
    sourceIndex: numberOr(value.sourceIndex, -1),
    targetIndex: numberOr(value.targetIndex, -1),
    parentSelector,
    matchedBy,
  };
}

function normalizeCssDebugGroupScale(value: unknown): UiInspectCssDebugInteraction['groupScale'] {
  if (!isRecord(value)) return undefined;
  const affectedChildren = numberOr(value.affectedChildren, 0);
  if (affectedChildren <= 0) return undefined;
  const childEffects: NonNullable<UiInspectCssDebugInteraction['groupScale']>['childEffects'] = [];
  if (Array.isArray(value.childEffects)) {
    for (const item of value.childEffects.slice(0, 20)) {
      if (!isRecord(item)) continue;
      const selector = typeof item.selector === 'string' ? item.selector : '';
      if (!selector) continue;
      childEffects.push({
        selector,
        tagName: typeof item.tagName === 'string' ? item.tagName : '',
        beforeRect: normalizeRect(item.beforeRect),
        afterRect: normalizeRect(item.afterRect),
      });
    }
  }
  const origin = value.origin === 'center' ? 'center' : 'top-left';
  return {
    scaleX: numberOr(value.scaleX, 1),
    scaleY: numberOr(value.scaleY, 1),
    origin,
    affectedChildren,
    childEffects,
  };
}

function normalizeCssDebugInteractionHandle(value: unknown): UiInspectCssDebugInteraction['handle'] {
  return value === 'e' || value === 's' || value === 'se' || value === 'nw' || value === 'n' || value === 'ne' || value === 'w' || value === 'sw' || value === 'move' ? value : undefined;
}

function normalizeCssDebugInteractionProperties(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeRect(value: unknown): { x: number; y: number; width: number; height: number } {
  const input = isRecord(value) ? value : {};
  return {
    x: numberOr(input.x, 0),
    y: numberOr(input.y, 0),
    width: numberOr(input.width, 0),
    height: numberOr(input.height, 0),
  };
}

function normalizeScopeGuard(value: unknown): import('@ui-inspect/protocol').UiInspectCssDebugScopeGuard | undefined {
  if (!isRecord(value)) return undefined;
  const enabled = typeof value.enabled === 'boolean' ? value.enabled : false;
  if (!enabled) return undefined;
  const boundaryType = value.boundaryType === 'component' || value.boundaryType === 'container' || value.boundaryType === 'parent'
    ? value.boundaryType
    : 'parent';
  return {
    enabled,
    boundaryType,
    boundarySelector: stringOr(value.boundarySelector, ''),
    componentName: typeof value.componentName === 'string' ? value.componentName : undefined,
    sourceFile: typeof value.sourceFile === 'string' ? value.sourceFile : undefined,
    rect: normalizeRect(value.rect),
    clamped: typeof value.clamped === 'boolean' ? value.clamped : undefined,
    clampReason: typeof value.clampReason === 'string' ? value.clampReason : undefined,
  };
}

function rectSizeChanged(before: unknown, after: unknown): boolean {
  const a = normalizeRect(before);
  const b = normalizeRect(after);
  return Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5;
}

function rectPositionChanged(before: unknown, after: unknown): boolean {
  const a = normalizeRect(before);
  const b = normalizeRect(after);
  return Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5;
}

function stringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
}

const VALID_STYLE_SOURCE_HINT_KINDS = new Set<UiInspectStyleSourceHintKind>([
  'vue-sfc-style-rule', 'style-rule', 'template-class', 'inline-style', 'parent-layout-rule', 'fallback-source',
]);

export function normalizeStyleSourceHints(value: unknown): UiInspectStyleSourceHint[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const hints = value
    .map((item): UiInspectStyleSourceHint | undefined => {
      if (!isRecord(item)) return undefined;
      const kind = typeof item.kind === 'string' && VALID_STYLE_SOURCE_HINT_KINDS.has(item.kind as UiInspectStyleSourceHintKind)
        ? item.kind as UiInspectStyleSourceHintKind
        : undefined;
      if (!kind) return undefined;
      const file = typeof item.file === 'string' ? item.file : undefined;
      if (!file) return undefined;
      const targetId = typeof item.targetId === 'string' ? item.targetId : '';
      if (!targetId) return undefined;
      return {
        id: typeof item.id === 'string' ? item.id : `hint-${Date.now()}`,
        targetId,
        kind,
        file,
        line: typeof item.line === 'number' ? item.line : null,
        column: typeof item.column === 'number' ? item.column : null,
        endLine: typeof item.endLine === 'number' ? item.endLine : null,
        selector: typeof item.selector === 'string' ? item.selector : undefined,
        matchedBy: Array.isArray(item.matchedBy) ? (item.matchedBy as unknown[]).filter((v): v is string => typeof v === 'string') : [],
        properties: Array.isArray(item.properties) ? (item.properties as unknown[]).filter((v): v is string => typeof v === 'string') : [],
        confidence: typeof item.confidence === 'number' && Number.isFinite(item.confidence) && item.confidence >= 0 && item.confidence <= 1
          ? item.confidence
          : 0,
        reason: typeof item.reason === 'string' ? item.reason : '',
        snippet: typeof item.snippet === 'string' ? item.snippet.slice(0, 300) : undefined,
      };
    })
    .filter((hint): hint is UiInspectStyleSourceHint => hint !== undefined);
  return hints.length > 0 ? hints.slice(0, 20) : undefined;
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
