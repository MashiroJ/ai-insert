import { fetchSelection, readSelectionSource } from '@ui-inspect/server';
import type { ToolArgs } from '../types.js';
import { extractContext } from '../wait.js';

export async function getFrontendSourceHandler(args: unknown, daemonUrl: string): Promise<unknown> {
  const selection = await fetchSelection(daemonUrl);
  if (!selection.active || !selection.selection) throw new Error('No active selection.');
  return await readSelectionSource(selection.selection, extractContext((args ?? {}) as ToolArgs));
}
