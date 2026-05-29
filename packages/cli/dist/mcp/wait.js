// Wait loop and latest request tracking
import { fetchSessions, readSelectionSource, updateSessionStatus, delay } from '@ui-inspect/server';
import { compactFrontendRequestResult } from './compact.js';
let latestFrontendRequestCache = null;
export async function waitForFrontendRequest(args, daemonUrl, sessionId) {
    const timeoutMs = extractTimeoutMs(args);
    const context = extractContext(args);
    const sinceTimestamp = extractSinceTimestamp(args);
    const afterRequestId = extractAfterRequestId(args);
    const responseMode = extractResponseMode(args);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
        const sessions = await fetchSessions(daemonUrl);
        const request = latestFrontendRequest(sessionId ? { sessions: sessions.sessions.filter((session) => session.id === sessionId) } : sessions, sinceTimestamp, afterRequestId);
        if (request) {
            let claimedSession = request.session;
            try {
                claimedSession = await updateSessionStatus(request.session.id, 'claimed', daemonUrl);
            }
            catch {
                // The request is still useful even if the browser status could not be updated.
            }
            const result = await buildFrontendRequestResult({
                session: claimedSession,
                message: request.message,
                requestId: request.requestId,
                daemonUrl,
                context,
            });
            setLatestFrontendRequest(result);
            return responseMode === 'compact' ? compactFrontendRequestResult(result) : result;
        }
        await delay(Math.min(1000, Math.max(50, deadline - Date.now())));
    }
    return {
        ok: false,
        timedOut: true,
        timeoutMs,
        message: `No browser request was sent within ${Math.round(timeoutMs / 1000)} seconds.`,
    };
}
export function getLatestFrontendRequest() {
    return latestFrontendRequestCache?.request ?? null;
}
export function setLatestFrontendRequest(request) {
    latestFrontendRequestCache = {
        timestamp: Date.now(),
        request,
    };
}
export function clearLatestFrontendRequest() {
    latestFrontendRequestCache = null;
}
export function extractAfterRequestId(args) {
    return typeof args.afterRequestId === 'string' ? args.afterRequestId : undefined;
}
export function extractSinceTimestamp(args, now = Date.now()) {
    if (typeof args.sinceTimestamp === 'number') {
        return args.sinceTimestamp;
    }
    return now - 30 * 1000;
}
export function extractTimeoutMs(args) {
    if (typeof args.timeoutMs === 'number') {
        return Math.min(args.timeoutMs, 10 * 60 * 1000);
    }
    return 10 * 60 * 1000;
}
export function extractContext(args) {
    if (typeof args.context === 'number') {
        return args.context;
    }
    return 80;
}
export function extractResponseMode(args) {
    return args.responseMode === 'full' ? 'full' : 'compact';
}
export function latestFrontendRequest(data, sinceTimestamp, afterRequestId) {
    const candidates = [];
    for (const session of data.sessions) {
        // Collect user messages
        const userMessages = session.messages.filter((m) => m.role === 'user');
        for (let i = 0; i < userMessages.length; i++) {
            const msg = userMessages[i];
            candidates.push({
                session,
                message: msg,
                requestId: `message:${msg.id}`,
                timestamp: msg.timestamp,
                sortKey: msg.timestamp * 1000 + i,
            });
        }
        // Check for selection-based requests (sent selection without a matching user message)
        if (session.selection && session.status === 'sent') {
            const sel = session.selection;
            const hasMatchingMessage = userMessages.some((m) => m.selectionId === sel.id);
            if (!hasMatchingMessage) {
                const targets = session.targets;
                const hasNotes = targets && targets.length > 0 && targets.some((t) => t.note);
                const syntheticContent = hasNotes
                    ? `Browser selection sent without additional user text.\n\nTarget notes:\n${targets.filter((t) => t.note).map((t) => `- ${t.note}`).join('\n')}`
                    : 'Browser selection sent without additional user text.';
                candidates.push({
                    session,
                    message: {
                        id: `synthetic-${sel.id}`,
                        sessionId: session.id,
                        role: 'user',
                        content: syntheticContent,
                        timestamp: sel.timestamp,
                        selectionId: sel.id,
                    },
                    requestId: `selection:${sel.id}`,
                    timestamp: sel.timestamp,
                    sortKey: sel.timestamp * 1000 - 1,
                });
            }
        }
    }
    // Sort by timestamp then by insertion order
    candidates.sort((a, b) => a.sortKey - b.sortKey);
    // Filter by afterRequestId cursor
    if (afterRequestId) {
        const cursorIndex = candidates.findIndex((c) => c.requestId === afterRequestId);
        if (cursorIndex >= 0) {
            // Return the next candidate after the cursor
            const next = candidates[cursorIndex + 1];
            if (next && next.timestamp >= sinceTimestamp) {
                return {
                    session: next.session,
                    message: next.message,
                    requestId: next.requestId,
                };
            }
            return null;
        }
        // Unknown cursor: fall back to sinceTimestamp filter
    }
    // Find the first candidate >= sinceTimestamp
    const result = candidates.find((c) => c.timestamp >= sinceTimestamp);
    if (!result)
        return null;
    return {
        session: result.session,
        message: result.message,
        requestId: result.requestId,
    };
}
export async function buildFrontendRequestResult(options) {
    const { session, message, requestId, context } = options;
    const selection = session.selection;
    const targets = normalizeResultTargets(session);
    const source = selection ? await readSourceSafely(selection, context) : null;
    const targetSources = await Promise.all(targets.map(async (target) => ({
        id: target.id,
        note: target.note,
        source: await readSourceSafely(target.selection, context),
    })));
    const diagnostics = session.diagnostics ?? selection?.diagnostics ?? targets.find((target) => target.diagnostics)?.diagnostics;
    return {
        ok: true,
        timedOut: false,
        requestId,
        nextCursor: { afterRequestId: requestId },
        message,
        session: {
            id: session.id,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            status: session.status,
            mode: session.mode,
        },
        selection: selection ? compactSelection(selection) : null,
        targets,
        targetCount: targets.length,
        source,
        targetSources,
        batchContext: targets.length > 1 ? {
            targetCount: targets.length,
            notes: targets.map((target) => ({ id: target.id, note: target.note })).filter((item) => item.note),
        } : undefined,
        diagnostics,
        contextSummary: summarizeRequestContext(selection, message),
        targetsSummary: summarizeRequestTargets(targets),
        sourceHintSummary: summarizeSourceHints(selection, targets),
        runtimeSummary: summarizeRuntimeDiagnostics(diagnostics),
    };
}
function normalizeResultTargets(session) {
    if (Array.isArray(session.targets) && session.targets.length)
        return session.targets;
    return session.selection ? [{
            id: session.selection.id,
            note: session.selection.note ?? '',
            selection: session.selection,
        }] : [];
}
async function readSourceSafely(selection, context) {
    if (!selection.source?.root || !selection.source?.file)
        return null;
    try {
        return await readSelectionSource(selection, context);
    }
    catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}
function compactSelection(selection) {
    return {
        id: selection.id,
        sessionId: selection.sessionId,
        url: selection.url,
        title: selection.title,
        timestamp: selection.timestamp,
        instruction: selection.instruction,
        framework: selection.framework,
        tagName: selection.dom?.tagName,
        selector: selection.dom?.selector,
        text: selection.dom?.text,
        componentName: selection.component?.name ?? selection.vue?.componentName ?? null,
        sourceFile: selection.source?.file ?? null,
        sourceLine: selection.source?.line ?? null,
        sourceColumn: selection.source?.column ?? null,
        component: selection.component ?? null,
        vue: selection.vue ?? null,
        source: selection.source,
        context: selection.context,
        sourceHints: selection.sourceHints,
    };
}
function summarizeRequestContext(selection, message) {
    const parts = [];
    if (selection) {
        const component = selection.component?.name ?? selection.vue?.componentName;
        if (component)
            parts.push(component);
        if (selection.dom?.tagName) {
            const selector = selection.dom.id ? `${selection.dom.tagName}#${selection.dom.id}` : selection.dom.tagName;
            parts.push(selector);
        }
        const text = clean(selection.context?.accessibleName || selection.dom?.text);
        if (text)
            parts.push(text.slice(0, 80));
        if (selection.source?.file) {
            const suffix = selection.source.line ? `:${selection.source.line}` : '';
            parts.push(`${selection.source.file}${suffix}`);
        }
    }
    const request = clean(message.content);
    if (request)
        parts.push(`Request: ${request.slice(0, 160)}`);
    return parts.length ? `Element: ${parts.join(' • ')}` : '';
}
function summarizeRequestTargets(targets) {
    if (!targets.length)
        return 'No targets.';
    return targets.map((target, index) => {
        const selection = target.selection;
        const title = clean(selection.context?.accessibleName ||
            selection.context?.formContext?.label ||
            selection.context?.formContext?.placeholder ||
            selection.dom?.text ||
            selection.component?.name ||
            selection.vue?.componentName ||
            selection.dom?.tagName ||
            'element');
        const source = selection.source?.file
            ? ` (${selection.source.file}${selection.source.line ? `:${selection.source.line}` : ''})`
            : '';
        const note = clean(target.note) ? ` — ${clean(target.note)}` : '';
        return `${index + 1}. ${title.slice(0, 100)}${source}${note}`;
    }).join('\n');
}
function summarizeSourceHints(selection, targets) {
    const hints = [
        ...(selection?.sourceHints ?? []),
        ...targets.flatMap((target) => target.sourceHints ?? target.selection.sourceHints ?? []),
    ];
    if (!hints.length)
        return 'No source hints.';
    return hints.slice(0, 10).map((hint, index) => {
        const loc = hint.file ? `${hint.file}${hint.line ? `:${hint.line}` : ''}` : '(no file)';
        return `${index + 1}. ${hint.kind} ${loc} confidence=${hint.confidence}: ${hint.reason}`;
    }).join('\n');
}
function summarizeRuntimeDiagnostics(diagnostics) {
    const events = diagnostics?.runtimeEvents ?? [];
    if (!events.length)
        return 'No user-confirmed runtime diagnostics.';
    const errors = events.filter((event) => event.level === 'error').length;
    const warnings = events.filter((event) => event.level === 'warn').length;
    const lines = [`${events.length} user-confirmed runtime events (${errors} errors, ${warnings} warnings).`];
    for (const event of events.slice(0, 5)) {
        lines.push(`- [${event.level}] ${event.kind}: ${clean(event.message).slice(0, 180)}`);
    }
    if (diagnostics?.truncated)
        lines.push('Diagnostics were truncated in the browser.');
    return lines.join('\n');
}
function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}
//# sourceMappingURL=wait.js.map