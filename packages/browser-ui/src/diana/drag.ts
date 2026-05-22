/**
 * Diana drag handling
 */

import type { DianaPosition } from './types.js';
import { clampDianaPosition, saveDianaPosition, applyDianaPosition } from './position.js';
import { DIANA_SIZE, TOGGLE_ID } from './constants.js';

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
export function beginDianaDrag(event: MouseEvent, button: HTMLElement): DragState {
  const rect = button.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const initialX = rect.left;
  const initialY = rect.top;

  button.setAttribute('data-dragging', 'true');

  return { startX, startY, initialX, initialY, isDragging: true };
}

/**
 * Move Diana during drag
 */
export function moveDiana(event: MouseEvent, button: HTMLElement, dragState: DragState): DianaPosition {
  if (!dragState.isDragging) return { x: 0, y: 0 };

  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;

  const newX = dragState.initialX + deltaX;
  const newY = dragState.initialY + deltaY;

  const clamped = clampDianaPosition(newX, newY);
  applyDianaPosition(button, clamped);

  return clamped;
}

/**
 * End Diana drag operation
 */
export function endDianaDrag(
  event: MouseEvent,
  button: HTMLElement,
  dragState: DragState,
  onDragEnd?: (position: DianaPosition) => void
): void {
  if (!dragState.isDragging) return;

  const finalPosition = moveDiana(event, button, dragState);
  button.removeAttribute('data-dragging');
  saveDianaPosition(finalPosition.x, finalPosition.y);

  onDragEnd?.(finalPosition);
}

/**
 * Set up drag event listeners on Diana button
 */
export function setupDragListeners(
  button: HTMLElement,
  onDragEnd?: (position: DianaPosition) => void
): () => void {
  let dragState: DragState | null = null;

  const onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return; // Only left click
    dragState = beginDianaDrag(event, button);
    event.preventDefault();
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!dragState?.isDragging) return;
    moveDiana(event, button, dragState);
  };

  const onMouseUp = (event: MouseEvent) => {
    if (!dragState?.isDragging) return;
    endDianaDrag(event, button, dragState, onDragEnd);
    dragState = null;
  };

  button.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Return cleanup function
  return () => {
    button.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}
