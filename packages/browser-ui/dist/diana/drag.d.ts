/**
 * Diana drag handling
 */
import type { DianaPosition } from './types.js';
export interface DragState {
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    isDragging: boolean;
}
/**
 * Begin Diana drag operation
 */
export declare function beginDianaDrag(event: MouseEvent, button: HTMLElement): DragState;
/**
 * Move Diana during drag
 */
export declare function moveDiana(event: MouseEvent, button: HTMLElement, dragState: DragState): DianaPosition;
/**
 * End Diana drag operation
 */
export declare function endDianaDrag(event: MouseEvent, button: HTMLElement, dragState: DragState, onDragEnd?: (position: DianaPosition) => void): void;
/**
 * Set up drag event listeners on Diana button
 */
export declare function setupDragListeners(button: HTMLElement, onDragEnd?: (position: DianaPosition) => void): () => void;
//# sourceMappingURL=drag.d.ts.map