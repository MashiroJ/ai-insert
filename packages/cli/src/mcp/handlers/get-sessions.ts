import { fetchSessions } from '@ui-inspect/server';

export async function getFrontendSessionsHandler(daemonUrl: string): Promise<unknown> {
  return await fetchSessions(daemonUrl);
}
