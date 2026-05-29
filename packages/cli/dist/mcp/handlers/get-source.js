import { fetchSelection, readSelectionSource } from '@ui-inspect/server';
import { extractContext } from '../wait.js';
export async function getFrontendSourceHandler(args, daemonUrl) {
    const selection = await fetchSelection(daemonUrl);
    if (!selection.active || !selection.selection)
        throw new Error('No active selection.');
    return await readSelectionSource(selection.selection, extractContext((args ?? {})));
}
//# sourceMappingURL=get-source.js.map