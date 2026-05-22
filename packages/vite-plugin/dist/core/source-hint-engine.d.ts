/**
 * Source Hint Engine
 *
 * Analyzes elements and framework metadata to generate source code location hints.
 */
import type { UiInspectComponentInfo, UiInspectSourceHint } from '@ui-inspect/protocol';
import type { FrameworkAdapter } from '@ui-inspect/browser-adapter';
export interface SourceHintEngineOptions {
    projectRoot: string;
}
export interface SourceHintAnalysis {
    hints: UiInspectSourceHint[];
    confidence: number;
}
/**
 * Source Hint Engine class
 */
export declare class SourceHintEngine {
    private options;
    constructor(options: SourceHintEngineOptions);
    /**
     * Generate source hints for an element
     */
    generateHints(element: HTMLElement, componentInfo: UiInspectComponentInfo | null, adapter: FrameworkAdapter | null): SourceHintAnalysis;
    /**
     * Extract template-related hints
     */
    private extractTemplateHint;
    /**
     * Extract hints from DOM attributes
     */
    private extractAttributeHints;
    /**
     * Extract style-related hints
     */
    private extractStyleHint;
    /**
     * Convert absolute path to relative path
     */
    private relativePath;
    private get rootLength();
    /**
     * Enhance hints with additional metadata
     */
    enhanceHints(hints: UiInspectSourceHint[], metadata: Record<string, unknown>): UiInspectSourceHint[];
    /**
     * Filter hints by minimum confidence
     */
    filterByConfidence(hints: UiInspectSourceHint[], minConfidence: number): UiInspectSourceHint[];
    /**
     * Get best hint (highest confidence)
     */
    getBestHint(hints: UiInspectSourceHint[]): UiInspectSourceHint | null;
    /**
     * Merge hints from multiple sources
     */
    mergeHints(...hintArrays: UiInspectSourceHint[][]): UiInspectSourceHint[];
}
