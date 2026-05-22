/**
 * Diana drag handling
 */
import { clampDianaPosition, saveDianaPosition, applyDianaPosition } from './position.js';
/**
 * Begin Diana drag operation
 */
export function beginDianaDrag(event, button) {
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
export function moveDiana(event, button, dragState) {
    if (!dragState.isDragging)
        return { x: 0, y: 0 };
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
export function endDianaDrag(event, button, dragState, onDragEnd) {
    if (!dragState.isDragging)
        return;
    const finalPosition = moveDiana(event, button, dragState);
    button.removeAttribute('data-dragging');
    saveDianaPosition(finalPosition.x, finalPosition.y);
    onDragEnd?.(finalPosition);
}
/**
 * Set up drag event listeners on Diana button
 */
export function setupDragListeners(button, onDragEnd) {
    let dragState = null;
    const onMouseDown = (event) => {
        if (event.button !== 0)
            return; // Only left click
        dragState = beginDianaDrag(event, button);
        event.preventDefault();
    };
    const onMouseMove = (event) => {
        if (!dragState?.isDragging)
            return;
        moveDiana(event, button, dragState);
    };
    const onMouseUp = (event) => {
        if (!dragState?.isDragging)
            return;
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
//# sourceMappingURL=drag.js.map