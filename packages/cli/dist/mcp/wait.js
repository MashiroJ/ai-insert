// Wait loop and latest request tracking
let latestFrontendRequestCache = null;
export async function waitForFrontendRequest(args, daemonUrl, sessionId) {
    throw new Error('Not implemented - will be in handlers/wait.ts');
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
//# sourceMappingURL=wait.js.map