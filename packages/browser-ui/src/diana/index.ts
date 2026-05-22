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
import {
  TOGGLE_ID,
  DIANA_SIZE,
  DIANA_SPRITE_URL,
  ICONS,
} from './constants.js';
import {
  readDianaPosition,
  applyDianaPosition,
} from './position.js';
import { setupDragListeners } from './drag.js';
import { setDianaState, updateDianaDirection } from './state.js';

export interface DianaComponent {
  element: HTMLElement;
  destroy: () => void;
}

/**
 * Create Diana component
 */
export function createDiana(options: DianaOptions = {}): DianaComponent {
  const {
    id = TOGGLE_ID,
    spriteUrl = DIANA_SPRITE_URL,
    initialState = 'idle',
    onDragStart,
    onDragEnd,
    onClick,
    onHover,
    onMenuOpen,
  } = options;

  // Check if Diana already exists
  const existing = document.getElementById(id);
  if (existing) {
    return {
      element: existing,
      destroy: () => {},
    };
  }

  // Create Diana button element
  const button = document.createElement('button');
  button.id = id;
  button.setAttribute('aria-label', 'ui-inspect 调试工具');

  // Apply base styles
  Object.assign(button.style, {
    position: 'fixed',
    zIndex: '2147483647',
    width: `${DIANA_SIZE.width}px`,
    height: `${DIANA_SIZE.height}px`,
    border: '0',
    background: 'transparent',
    color: 'white',
    padding: '0',
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
    filter: 'drop-shadow(0 14px 24px rgba(15,23,42,0.4))',
    transformOrigin: '50% 100%',
    outline: 'none',
  });

  // Create Diana sprite element
  const sprite = document.createElement('div');
  sprite.className = 'ui-inspect-diana';
  Object.assign(sprite.style, {
    position: 'absolute',
    left: '0',
    bottom: '0',
    width: `${DIANA_SIZE.width}px`,
    height: `${DIANA_SIZE.height}px`,
    backgroundImage: `url("${spriteUrl}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '576px 702px',
    backgroundPosition: '0 0',
    imageRendering: 'auto',
  });

  button.appendChild(sprite);
  document.body.appendChild(button);

  // Apply saved position
  const position = readDianaPosition();
  applyDianaPosition(button, position);
  updateDianaDirection(button, position);

  // Set initial state
  setDianaState(button, initialState);

  // Setup drag handling
  const cleanupDrag = setupDragListeners(button, (pos) => {
    onDragEnd?.(pos);
    updateDianaDirection(button, pos);
  });

  // Setup click handler
  button.addEventListener('click', () => {
    onClick?.();
  });

  // Setup hover handler
  button.addEventListener('mouseenter', () => {
    onHover?.();
  });

  return {
    element: button,
    destroy: () => {
      cleanupDrag();
      if (button.parentNode) {
        button.parentNode.removeChild(button);
      }
    },
  };
}

/**
 * Get Diana element
 */
export function getDianaElement(): HTMLElement | null {
  return document.getElementById(TOGGLE_ID);
}

/**
 * Update Diana state
 */
export function updateDianaState(state: DianaState, temporary?: boolean): void {
  const button = getDianaElement();
  if (button) {
    setDianaState(button, state, temporary);
  }
}
