/**
 * Diana state management
 */
import { STATE_TEXT } from './constants.js';
let currentState = 'idle';
let stateTimer = null;
/**
 * Get current Diana state
 */
export function getDianaState() {
    return currentState;
}
/**
 * Set Diana state with optional temporary timeout
 */
export function setDianaState(button, state, temporary) {
    currentState = state;
    button.setAttribute('data-state', state);
    // Clear any existing timer
    if (stateTimer) {
        clearTimeout(stateTimer);
        stateTimer = null;
    }
    // If temporary, auto-reset to idle
    if (temporary && state !== 'idle') {
        stateTimer = setTimeout(() => {
            setDianaState(button, 'idle');
        }, 3000);
    }
}
/**
 * Get text for a Diana state
 */
export function dianaStateText(state) {
    return STATE_TEXT[state] || '';
}
/**
 * Update Diana direction based on position
 */
export function updateDianaDirection(button, position) {
    const midpoint = window.innerWidth / 2;
    const direction = position.x < midpoint ? 'right' : 'left';
    button.setAttribute('data-direction', direction);
}
/**
 * Create Diana state info object
 */
export function createStateInfo(state, temporary) {
    return {
        state,
        text: dianaStateText(state),
        temporary,
    };
}
/**
 * Reset state to idle
 */
export function resetDianaState(button) {
    setDianaState(button, 'idle');
}
/**
 * Clean up state resources
 */
export function destroyDianaState() {
    if (stateTimer) {
        clearTimeout(stateTimer);
        stateTimer = null;
    }
}
//# sourceMappingURL=state.js.map