import type { UiInspectSelection, UiInspectSourceResponse } from '@ui-inspect/protocol';
export declare function readSelectionSource(selection: UiInspectSelection, contextLines: number): Promise<UiInspectSourceResponse>;
export declare function openSource(value: unknown, projectRoot: string, requestedEditor?: string): {
    ok: boolean;
    editor?: string;
    command?: string;
    args?: string[];
    file?: string;
    error?: string;
};
