/**
 * Selector utilities for DOM element inspection
 */
export interface SelectorSpecificity {
    ids: number;
    classes: number;
    attributes: number;
    elements: number;
    pseudoClasses: number;
    total: number;
}
/**
 * Calculate CSS selector specificity
 */
export declare function calculateSpecificity(selector: string): SelectorSpecificity;
/**
 * Generate a unique selector for an element
 */
export declare function generateUniqueSelector(element: HTMLElement): string;
/**
 * Compare two selectors by specificity
 */
export declare function compareSpecificity(sel1: string, sel2: string): number;
/**
 * Check if a selector matches an element
 */
export declare function matchesSelector(element: HTMLElement, selector: string): boolean;
/**
 * Find the closest ancestor matching a selector
 */
export declare function closestAncestor(element: HTMLElement, selector: string): HTMLElement | null;
/**
 * Generate a data selector attribute if element has data attributes
 */
export declare function getDataSelector(element: HTMLElement): string | null;
//# sourceMappingURL=selector.d.ts.map