/**
 * Diana state management
 */

import type { DianaState, DianaStateInfo } from './types.js';
import { STATE_TEXT, ANIMATION_DURATION, SPRITE_POSITION } from './constants.js';

let currentState: DianaState = 'idle';
let stateTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Get current Diana state
 */
export function getDianaState(): DianaState {
  return currentState;
}

/**
 * Set Diana state with optional temporary timeout
 */
export function setDianaState(
  button: HTMLElement,
  state: DianaState,
  temporary?: boolean
): void {
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
export function dianaStateText(state: DianaState): string {
  return STATE_TEXT[state] || '';
}

/**
 * Update Diana direction based on position
 */
export function updateDianaDirection(button: HTMLElement, position: { x: number }): void {
  const midpoint = window.innerWidth / 2;
  const direction = position.x < midpoint ? 'right' : 'left';
  button.setAttribute('data-direction', direction);
}

/**
 * Create Diana state info object
 */
export function createStateInfo(state: DianaState, temporary?: boolean): DianaStateInfo {
  return {
    state,
    text: dianaStateText(state),
    temporary,
  };
}

/**
 * Reset state to idle
 */
export function resetDianaState(button: HTMLElement): void {
  setDianaState(button, 'idle');
}

/**
 * Clean up state resources
 */
export function destroyDianaState(): void {
  if (stateTimer) {
    clearTimeout(stateTimer);
    stateTimer = null;
  }
}
