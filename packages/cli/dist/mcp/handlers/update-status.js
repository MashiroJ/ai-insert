import { fetchSelection, updateSessionStatus } from '@ui-inspect/server';
export async function updateUiTaskStatusHandler(args, daemonUrl) {
    const input = args && typeof args === 'object' ? args : {};
    const status = normalizeStatus(input.status);
    const sessionId = typeof input.sessionId === 'string' && input.sessionId.trim()
        ? input.sessionId.trim()
        : await activeSessionId(daemonUrl);
    const session = await updateSessionStatus(sessionId, status, daemonUrl);
    return { ok: true, session };
}
function normalizeStatus(value) {
    if (value === 'claimed' || value === 'working' || value === 'done' || value === 'failed')
        return value;
    throw new Error('status must be claimed, working, done, or failed');
}
async function activeSessionId(daemonUrl) {
    const active = await fetchSelection(daemonUrl);
    if (!active.active || !active.selection?.sessionId)
        throw new Error('sessionId is required when there is no active selection');
    return active.selection.sessionId;
}
//# sourceMappingURL=update-status.js.map