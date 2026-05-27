import { fetchSelection } from '@ui-inspect/server';

export async function getFrontendSelectionHandler(daemonUrl: string): Promise<unknown> {
  return await fetchSelection(daemonUrl);
}
