/**
 * Diana position management
 */
import type { DianaPosition } from './types.js';
/**
 * Read saved Diana position from localStorage
 */
export declare function readDianaPosition(): DianaPosition;
/**
 * Save Diana position to localStorage
 */
export declare function saveDianaPosition(x: number, y: number): void;
/**
 * Clamp Diana position to viewport bounds
 */
export declare function clampDianaPosition(x: number, y: number): DianaPosition;
/**
 * Apply position to Diana button element
 */
export declare function applyDianaPosition(button: HTMLElement, position: DianaPosition): void;
//# sourceMappingURL=position.d.ts.map