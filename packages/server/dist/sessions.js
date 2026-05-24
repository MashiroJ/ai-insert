import { isRecord, numberOr, stringOr } from './utils.js';
import { SELECTION_TTL_MS } from './state.js';
export function selectionResponse(state) {
    if (!state.currentSelection)
        return { active: false, selection: null, session: null, ageMs: null };
    const ageMs = Date.now() - state.currentSelectionReceivedAt;
    if (ageMs > SELECTION_TTL_MS) {
        state.currentSelection = null;
        state.currentSelectionReceivedAt = 0;
        return { active: false, selection: null, session: null, ageMs: null };
    }
    return { active: true, selection: state.currentSelection, session: state.sessions.get(state.currentSelection.sessionId) ?? null, ageMs };
}
export function normalizeSelection(value) {
    if (!value || typeof value !== 'object')
        throw new Error('selection object required');
    const input = value;
    if (!input.dom || !input.source)
        throw new Error('invalid selection payload');
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
export function upsertSessionFromSelection(selection, state, incomingTargets, mode, diagnostics, cssDebug) {
    const now = Date.now();
    const existing = state.sessions.get(selection.sessionId);
    const message = createMessage(selection.sessionId, 'user', selection.instruction, selection.id);
    const targets = incomingTargets?.length ? incomingTargets : normalizeTargets(undefined, selection);
    if (existing) {
        existing.selection = selection;
        existing.targets = targets;
        if (mode)
            existing.mode = mode;
        if (diagnostics)
            existing.diagnostics = diagnostics;
        if (cssDebug) {
            existing.cssDebug = cssDebug;
        }
        else {
            delete existing.cssDebug;
        }
        existing.status = 'sent';
        existing.updatedAt = now;
        if (selection.instruction)
            existing.messages.push(message);
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
export function normalizeTargets(value, fallback) {
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
export function normalizeDiagnostics(value) {
    if (!isRecord(value) || !Array.isArray(value.runtimeEvents))
        return undefined;
    return {
        runtimeEvents: value.runtimeEvents,
        capturedAt: numberOr(value.capturedAt, Date.now()),
        truncated: typeof value.truncated === 'boolean' ? value.truncated : undefined,
    };
}
export function normalizeSessionMode(value) {
    return value === 'source' || value === 'single' || value === 'batch' || value === 'troubleshoot' || value === 'css-debug'
        ? value
        : undefined;
}
export function normalizeCssDebugPayload(value, fallback) {
    if (!isRecord(value))
        return undefined;
    const selection = isRecord(value.selection) ? normalizeSelection(value.selection) : fallback;
    const selectedElement = isRecord(value.selectedElement) ? value.selectedElement : selection.dom;
    return {
        selection,
        selectedElement,
        originalStyles: normalizeStyleRecord(value.originalStyles),
        previewStyles: normalizeStyleRecord(value.previewStyles),
        changedStyles: normalizeStyleChanges(value.changedStyles),
        computedEffects: normalizeCssDebugComputedEffects(value.computedEffects),
        layoutContext: normalizeCssDebugLayoutContext(value.layoutContext),
        interactions: normalizeCssDebugInteractions(value.interactions),
        primaryInteraction: normalizeCssDebugInteraction(value.primaryInteraction),
        note: typeof value.note === 'string' ? value.note : selection.note,
        sourceHints: Array.isArray(value.sourceHints) ? value.sourceHints : selection.sourceHints,
        session: normalizeCssDebugSessionInfo(value.session, selection),
    };
}
function normalizeCssDebugSessionInfo(value, selection) {
    const input = isRecord(value) ? value : {};
    return {
        id: stringOr(input.id, selection.sessionId),
        url: stringOr(input.url, selection.url),
        title: stringOr(input.title, selection.title),
        root: typeof input.root === 'string' || input.root === null ? input.root : selection.source.root,
        timestamp: numberOr(input.timestamp, selection.timestamp),
    };
}
function normalizeStyleRecord(value) {
    if (!isRecord(value))
        return {};
    const styles = {};
    for (const [property, styleValue] of Object.entries(value)) {
        if (typeof styleValue === 'string') {
            styles[property] = styleValue;
        }
        else if (typeof styleValue === 'number' || typeof styleValue === 'boolean') {
            styles[property] = String(styleValue);
        }
    }
    return styles;
}
function normalizeStyleChanges(value) {
    if (!isRecord(value))
        return {};
    const changes = {};
    for (const [property, rawChange] of Object.entries(value)) {
        if (!isRecord(rawChange))
            continue;
        changes[property] = {
            originalValue: stringOrNull(rawChange.originalValue ?? rawChange.from),
            previewValue: stringOrNull(rawChange.previewValue ?? rawChange.to),
        };
    }
    return changes;
}
function normalizeCssDebugComputedEffects(value) {
    if (!isRecord(value))
        return undefined;
    return {
        self: normalizeStyleChanges(value.self),
    };
}
function normalizeCssDebugLayoutContext(value) {
    if (!isRecord(value))
        return undefined;
    return {
        parent: normalizeElementSnapshot(value.parent),
        siblings: normalizeElementEffects(value.siblings),
        children: normalizeElementEffects(value.children),
    };
}
function normalizeElementSnapshot(value) {
    if (!isRecord(value))
        return undefined;
    return {
        selector: stringOr(value.selector, ''),
        tagName: stringOr(value.tagName, ''),
        className: stringOr(value.className, ''),
        text: stringOr(value.text, ''),
        rect: normalizeRect(value.rect),
        styles: normalizeStyleRecord(value.styles),
    };
}
function normalizeElementEffects(value) {
    if (!Array.isArray(value))
        return [];
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
function normalizeCssDebugInteractions(value) {
    if (!Array.isArray(value))
        return undefined;
    return value.slice(0, 20).map((item) => normalizeCssDebugInteraction(item)).filter((item) => !!item);
}
function normalizeCssDebugInteraction(value) {
    if (!isRecord(value))
        return undefined;
    return {
        type: normalizeCssDebugInteractionType(value.type),
        handle: normalizeCssDebugInteractionHandle(value.handle),
        properties: normalizeCssDebugInteractionProperties(value.properties),
        rectBefore: normalizeRect(value.rectBefore),
        rectAfter: normalizeRect(value.rectAfter),
        delta: normalizeRect(value.delta),
        strategy: value.strategy === 'transform-preview' ? 'transform-preview' : 'inline-style',
        timestamp: numberOr(value.timestamp, Date.now()),
    };
}
function normalizeCssDebugInteractionType(value) {
    return value === 'resize' || value === 'move' ? value : 'panel-control';
}
function normalizeCssDebugInteractionHandle(value) {
    return value === 'e' || value === 's' || value === 'se' || value === 'move' ? value : undefined;
}
function normalizeCssDebugInteractionProperties(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => typeof item === 'string');
}
function normalizeRect(value) {
    const input = isRecord(value) ? value : {};
    return {
        x: numberOr(input.x, 0),
        y: numberOr(input.y, 0),
        width: numberOr(input.width, 0),
        height: numberOr(input.height, 0),
    };
}
function rectSizeChanged(before, after) {
    const a = normalizeRect(before);
    const b = normalizeRect(after);
    return Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5;
}
function rectPositionChanged(before, after) {
    const a = normalizeRect(before);
    const b = normalizeRect(after);
    return Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5;
}
function stringOrNull(value) {
    if (value === null || value === undefined)
        return null;
    return typeof value === 'string' ? value : String(value);
}
export function normalizeTaskStatus(value) {
    return value === 'draft' || value === 'sent' || value === 'claimed' || value === 'working' || value === 'done' || value === 'failed'
        ? value
        : 'working';
}
export function appendMessage(sessionId, role, content, selectionId, state) {
    const now = Date.now();
    const session = state.sessions.get(sessionId);
    if (!session)
        throw new Error(`session not found: ${sessionId}`);
    const message = createMessage(sessionId, role, content, selectionId);
    session.messages.push(message);
    session.updatedAt = now;
    state.saveSessions();
    return message;
}
export function appendAssistantMessage(sessionId, content, selectionId, state) {
    const now = Date.now();
    const session = state.sessions.get(sessionId);
    if (!session)
        throw new Error(`session not found: ${sessionId}`);
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
export function createMessage(sessionId, role, content, selectionId) {
    return {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId,
        role,
        content,
        timestamp: Date.now(),
        selectionId,
    };
}
//# sourceMappingURL=sessions.js.map