/**
 * Selection Manager
 *
 * Handles element selection, highlighting, and selector generation.
 */
import type { UiInspectComponentInfo, UiInspectSourceHint } from '@ui-inspect/protocol';
import type { FrameworkAdapter } from '@ui-inspect/browser-adapter';
export interface SelectionManagerOptions {
    boxId: string;
    onHover?: (element: HTMLElement | null) => void;
}
export interface ElementContext {
    accessibleName?: string;
    role?: string;
    attributes?: Record<string, string>;
    parentChain?: ElementSummary[];
    siblingsSummary?: ElementSummary[];
    childrenSummary?: ElementSummary[];
    formContext?: {
        label?: string;
        placeholder?: string;
        name?: string;
        type?: string;
    };
    interactionState?: {
        hover?: boolean;
        active?: boolean;
        focus?: boolean;
        focusWithin?: boolean;
    };
    computedStyles?: Record<string, string>;
    pseudoElements?: {
        before?: Record<string, string>;
        after?: Record<string, string>;
    };
}
export interface ElementSummary {
    tagName: string;
    selector?: string;
    role?: string;
    text?: string;
    attributes?: Record<string, string>;
}
/**
 * Selection Manager class
 */
export declare class SelectionManager {
    private options;
    private box;
    private hoveredElement;
    private activeElement;
    private frameworkAdapter;
    private rafId;
    private scrollHandler;
    private resizeHandler;
    constructor(options: SelectionManagerOptions);
    /**
     * Set the framework adapter for component info extraction
     */
    setFrameworkAdapter(adapter: FrameworkAdapter | null): void;
    /**
     * Ensure highlight box exists
     */
    private ensureBox;
    /**
     * Update hover state for an element
     */
    updateHover(element: HTMLElement | null): void;
    /**
     * Get the currently hovered element
     */
    getHovered(): HTMLElement | null;
    /**
     * Get the currently active (selected) element
     */
    getActive(): HTMLElement | null;
    /**
     * Set the active element
     */
    setActive(element: HTMLElement | null): void;
    /**
     * Highlight an element with the box
     */
    private highlightElement;
    /**
     * Clear the highlight box
     */
    private clearHighlight;
    /**
     * Generate a unique selector for an element
     */
    selectorFor(element: HTMLElement): string;
    /**
     * Get element attributes as a record
     */
    attributesFor(element: HTMLElement): Record<string, string>;
    /**
     * Get parent chain for an element
     */
    parentChainFor(element: HTMLElement): ElementSummary[];
    /**
     * Get siblings summary for an element
     */
    siblingsFor(element: HTMLElement): ElementSummary[];
    /**
     * Get children summary for an element
     */
    childrenFor(element: HTMLElement): ElementSummary[];
    /**
     * Get accessible name for an element
     */
    accessibleNameFor(element: HTMLElement): string | undefined;
    /**
     * Get form context for an element
     */
    formContextFor(element: HTMLElement): {
        label?: string;
        placeholder?: string;
        name?: string;
        type?: string;
    } | undefined;
    /**
     * Get interaction state for an element
     */
    interactionStateFor(element: HTMLElement): {
        hover?: boolean;
        active?: boolean;
        focus?: boolean;
        focusWithin?: boolean;
    };
    /**
     * Get style summary for an element
     */
    styleSummary(element: HTMLElement): Record<string, string>;
    /**
     * Get pseudo element styles
     */
    pseudoSummary(element: HTMLElement, pseudo: '::before' | '::after'): Record<string, string> | undefined;
    /**
     * Get element context
     */
    elementContextFor(element: HTMLElement): ElementContext;
    /**
     * Get element summary
     */
    elementSummaryFor(element: HTMLElement): ElementSummary;
    /**
     * Get component info using framework adapter
     */
    componentInfoFor(element: HTMLElement): UiInspectComponentInfo | null;
    /**
     * Get source hints using framework adapter
     */
    sourceHintsFor(element: HTMLElement): UiInspectSourceHint[];
    /**
     * Escape CSS identifiers
     */
    private cssEscape;
    /**
     * Keep highlight position in sync during scroll and resize using rAF throttle
     */
    private startPositionTracker;
    /**
     * Destroy the selection manager
     */
    destroy(): void;
}
