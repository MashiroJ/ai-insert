/**
 * Diana component - The floating mascot for ui-inspect
 *
 * Diana is a draggable, animated character that provides
 * quick access to ui-inspect features.
 */
export * from './types.js';
export * from './constants.js';
export * from './position.js';
export * from './drag.js';
export * from './state.js';
import type { DianaOptions, DianaState } from './types.js';
export interface DianaComponent {
    element: HTMLElement;
    destroy: () => void;
}
/**
 * Create Diana component
 */
export declare function createDiana(options?: DianaOptions): DianaComponent;
/**
 * Get Diana element
 */
export declare function getDianaElement(): HTMLElement | null;
/**
 * Update Diana state
 */
export declare function updateDianaState(state: DianaState, temporary?: boolean): void;
//# sourceMappingURL=index.d.ts.map