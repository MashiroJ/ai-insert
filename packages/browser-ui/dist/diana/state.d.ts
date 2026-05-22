/**
 * Diana state management
 */
import type { DianaState, DianaStateInfo } from './types.js';
/**
 * Get current Diana state
 */
export declare function getDianaState(): DianaState;
/**
 * Set Diana state with optional temporary timeout
 */
export declare function setDianaState(button: HTMLElement, state: DianaState, temporary?: boolean): void;
/**
 * Get text for a Diana state
 */
export declare function dianaStateText(state: DianaState): string;
/**
 * Update Diana direction based on position
 */
export declare function updateDianaDirection(button: HTMLElement, position: {
    x: number;
}): void;
/**
 * Create Diana state info object
 */
export declare function createStateInfo(state: DianaState, temporary?: boolean): DianaStateInfo;
/**
 * Reset state to idle
 */
export declare function resetDianaState(button: HTMLElement): void;
/**
 * Clean up state resources
 */
export declare function destroyDianaState(): void;
//# sourceMappingURL=state.d.ts.map