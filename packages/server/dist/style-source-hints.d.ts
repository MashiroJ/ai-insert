import type { UiInspectCssDebugPayload } from '@ui-inspect/protocol';
export interface BuildStyleSourceHintsInput {
    projectRoot: string;
    cssDebug: UiInspectCssDebugPayload;
    contextLines?: number;
    maxHintsPerTarget?: number;
    maxTotalHints?: number;
}
export declare function buildCssDebugStyleSourceHints(input: BuildStyleSourceHintsInput): UiInspectCssDebugPayload;
