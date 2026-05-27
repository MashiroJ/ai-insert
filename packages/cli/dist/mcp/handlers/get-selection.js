import { fetchSelection } from '@ui-inspect/server';
export async function getFrontendSelectionHandler(daemonUrl) {
    return await fetchSelection(daemonUrl);
}
//# sourceMappingURL=get-selection.js.map