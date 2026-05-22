/**
 * Diana position management
 */

import type { DianaPosition } from './types.js';
import { POSITION_KEY, DIANA_SIZE } from './constants.js';

const DEFAULT_POSITION: DianaPosition = { x: window.innerWidth - DIANA_SIZE.width - 12, y: window.innerHeight - DIANA_SIZE.height - 12 };

/**
 * Read saved Diana position from localStorage
 */
export function readDianaPosition(): DianaPosition {
  try {
    const saved = localStorage.getItem(POSITION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return clampDianaPosition(parsed.x, parsed.y);
      }
    }
  } catch {
    // Ignore errors
  }
  return { ...DEFAULT_POSITION };
}

/**
 * Save Diana position to localStorage
 */
export function saveDianaPosition(x: number, y: number): void {
  const clamped = clampDianaPosition(x, y);
  localStorage.setItem(POSITION_KEY, JSON.stringify(clamped));
}

/**
 * Clamp Diana position to viewport bounds
 */
export function clampDianaPosition(x: number, y: number): DianaPosition {
  const maxX = window.innerWidth - DIANA_SIZE.width - 12;
  const maxY = window.innerHeight - DIANA_SIZE.height - 12;

  return {
    x: Math.max(12, Math.min(x, maxX)),
    y: Math.max(12, Math.min(y, maxY)),
  };
}

/**
 * Apply position to Diana button element
 */
export function applyDianaPosition(button: HTMLElement, position: DianaPosition): void {
  button.style.right = '';
  button.style.bottom = '';
  button.style.left = `${position.x}px`;
  button.style.top = `${position.y}px`;
}
