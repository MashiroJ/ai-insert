/**
 * CSS Debug Scope Guard - Movement boundary constraints
 *
 * Simple first version:
 * - Priority: component root → stable parent container → direct parent
 * - If no reliable boundary found: disable free drag
 * - No fallback to viewport
 */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface ScopeGuard {
    enabled: boolean;
    boundaryType: 'component' | 'container' | 'parent';
    boundarySelector: string;
    componentName?: string;
    sourceFile?: string;
    rect: Rect;
    clamped?: boolean;
    clampReason?: string;
}
/**
 * Find the nearest stable boundary element for CSS Debug constraints
 * Priority: component root → stable container → parent → none
 */
export declare function resolveCssDebugBoundary(element: HTMLElement): ScopeGuard | null;
/**
 * Clamp a rect to stay within boundary
 */
export declare function clampRectToBoundary(rect: Rect, boundary: Rect): {
    clamped: boolean;
    result: Rect;
    clampDelta?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
};
/**
 * Clamp move interaction delta
 */
export declare function clampMoveInteraction(elementRect: Rect, boundary: Rect, dx: number, dy: number): {
    clamped: boolean;
    clampDx: number;
    clampDy: number;
};
/**
 * Clamp resize interaction
 */
export declare function clampResizeInteraction(elementRect: Rect, boundary: Rect, handle: string, dx: number, dy: number): {
    clamped: boolean;
    clampDx: number;
    clampDy: number;
    resultWidth: number;
    resultHeight: number;
    resultX?: number;
    resultY?: number;
};
//# sourceMappingURL=css-debug-scope.d.ts.map