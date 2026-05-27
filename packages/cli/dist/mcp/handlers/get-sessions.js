import { fetchSessions } from '@ui-inspect/server';
export async function getFrontendSessionsHandler(daemonUrl) {
    return await fetchSessions(daemonUrl);
}
//# sourceMappingURL=get-sessions.js.map