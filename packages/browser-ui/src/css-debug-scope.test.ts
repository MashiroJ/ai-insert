import { describe, expect, it } from 'vitest';
import {
  clampRectToBoundary,
  clampMoveInteraction,
  clampResizeInteraction,
} from './css-debug-scope.js';
import type { Rect } from './css-debug-scope.js';

describe('clampRectToBoundary', () => {
  const boundary: Rect = { x: 0, y: 0, width: 400, height: 300 };

  it('does not clamp when rect is inside boundary', () => {
    const result = clampRectToBoundary({ x: 10, y: 10, width: 100, height: 80 }, boundary);
    expect(result.clamped).toBe(false);
    expect(result.result).toEqual({ x: 10, y: 10, width: 100, height: 80 });
    expect(result.clampDelta).toBeUndefined();
  });

  it('clamps left edge to boundary left', () => {
    const result = clampRectToBoundary({ x: -20, y: 10, width: 100, height: 80 }, boundary);
    expect(result.clamped).toBe(true);
    expect(result.result.x).toBe(0);
    expect(result.result.y).toBe(10);
  });

  it('clamps top edge to boundary top', () => {
    const result = clampRectToBoundary({ x: 10, y: -30, width: 100, height: 80 }, boundary);
    expect(result.clamped).toBe(true);
    expect(result.result.y).toBe(0);
    expect(result.result.x).toBe(10);
  });

  it('clamps right edge to boundary right', () => {
    const result = clampRectToBoundary({ x: 350, y: 10, width: 100, height: 80 }, boundary);
    expect(result.clamped).toBe(true);
    expect(result.result.x + result.result.width).toBeLessThanOrEqual(400);
  });

  it('clamps bottom edge to boundary bottom', () => {
    const result = clampRectToBoundary({ x: 10, y: 280, width: 100, height: 80 }, boundary);
    expect(result.clamped).toBe(true);
    expect(result.result.y + result.result.height).toBeLessThanOrEqual(300);
  });

  it('clamps width when element is larger than boundary', () => {
    const result = clampRectToBoundary({ x: 0, y: 0, width: 500, height: 80 }, boundary);
    expect(result.clamped).toBe(true);
    expect(result.result.width).toBe(400);
  });

  it('clamps height when element is larger than boundary', () => {
    const result = clampRectToBoundary({ x: 0, y: 0, width: 100, height: 500 }, boundary);
    expect(result.clamped).toBe(true);
    expect(result.result.height).toBe(300);
  });

  it('clamps all four edges simultaneously', () => {
    const result = clampRectToBoundary({ x: -50, y: -50, width: 600, height: 600 }, boundary);
    expect(result.clamped).toBe(true);
    expect(result.result.x).toBe(0);
    expect(result.result.y).toBe(0);
    expect(result.result.width).toBe(400);
    expect(result.result.height).toBe(300);
  });
});

describe('clampMoveInteraction', () => {
  const boundary: Rect = { x: 0, y: 0, width: 400, height: 300 };
  const elementRect: Rect = { x: 100, y: 100, width: 80, height: 60 };

  it('does not clamp small moves within boundary', () => {
    const result = clampMoveInteraction(elementRect, boundary, 10, 10);
    expect(result.clamped).toBe(false);
    expect(result.clampDx).toBe(10);
    expect(result.clampDy).toBe(10);
  });

  it('clamps move that would exceed left boundary', () => {
    const result = clampMoveInteraction(elementRect, boundary, -150, 0);
    expect(result.clamped).toBe(true);
    expect(result.clampDx).toBeGreaterThan(-150);
    expect(elementRect.x + result.clampDx).toBeGreaterThanOrEqual(0);
  });

  it('clamps move that would exceed right boundary', () => {
    const result = clampMoveInteraction(elementRect, boundary, 300, 0);
    expect(result.clamped).toBe(true);
    expect(elementRect.x + result.clampDx + elementRect.width).toBeLessThanOrEqual(400);
  });

  it('clamps move that would exceed top boundary', () => {
    const result = clampMoveInteraction(elementRect, boundary, 0, -150);
    expect(result.clamped).toBe(true);
    expect(elementRect.y + result.clampDy).toBeGreaterThanOrEqual(0);
  });

  it('clamps move that would exceed bottom boundary', () => {
    const result = clampMoveInteraction(elementRect, boundary, 0, 200);
    expect(result.clamped).toBe(true);
    expect(elementRect.y + result.clampDy + elementRect.height).toBeLessThanOrEqual(300);
  });

  it('clamps diagonal move in both axes', () => {
    const result = clampMoveInteraction(elementRect, boundary, -200, -200);
    expect(result.clamped).toBe(true);
    expect(elementRect.x + result.clampDx).toBeGreaterThanOrEqual(0);
    expect(elementRect.y + result.clampDy).toBeGreaterThanOrEqual(0);
  });
});

describe('clampResizeInteraction', () => {
  const boundary: Rect = { x: 0, y: 0, width: 400, height: 300 };
  const elementRect: Rect = { x: 100, y: 100, width: 80, height: 60 };

  it('does not clamp small right resize within boundary', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'e', 20, 0);
    expect(result.clamped).toBe(false);
    expect(result.resultWidth).toBe(100);
  });

  it('does not clamp small bottom resize within boundary', () => {
    const result = clampResizeInteraction(elementRect, boundary, 's', 0, 20);
    expect(result.clamped).toBe(false);
    expect(result.resultHeight).toBe(80);
  });

  it('clamps right resize that would exceed boundary', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'e', 300, 0);
    expect(result.clamped).toBe(true);
    expect(result.resultWidth).toBe(300);
  });

  it('clamps bottom resize that would exceed boundary', () => {
    const result = clampResizeInteraction(elementRect, boundary, 's', 0, 300);
    expect(result.clamped).toBe(true);
    expect(result.resultHeight).toBeLessThanOrEqual(300);
  });

  it('clamps se corner resize in both dimensions', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'se', 300, 300);
    expect(result.clamped).toBe(true);
    expect(result.resultWidth).toBeLessThanOrEqual(400);
    expect(result.resultHeight).toBeLessThanOrEqual(300);
  });

  it('clamps left resize (nw handle) and adjusts position', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'nw', -20, -20);
    expect(result.resultWidth).toBe(100);
    expect(result.resultHeight).toBe(80);
    expect(result.resultX).toBeDefined();
    expect(result.resultY).toBeDefined();
  });

  it('ensures minimum size of 1px', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'e', -79, 0);
    expect(result.resultWidth).toBeGreaterThanOrEqual(1);
  });

  it('marks right resize as clamped when minimum width is reached', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'e', -1000, 0);
    expect(result.clamped).toBe(true);
    expect(result.resultWidth).toBe(1);
    expect(result.clampDx).toBe(1 - elementRect.width);
  });

  it('marks bottom resize as clamped when minimum height is reached', () => {
    const result = clampResizeInteraction(elementRect, boundary, 's', 0, -1000);
    expect(result.clamped).toBe(true);
    expect(result.resultHeight).toBe(1);
    expect(result.clampDy).toBe(1 - elementRect.height);
  });

  it('clamps width to boundary width on extreme resize', () => {
    const bigElement: Rect = { x: 0, y: 0, width: 50, height: 50 };
    const result = clampResizeInteraction(bigElement, boundary, 'e', 500, 0);
    expect(result.resultWidth).toBeLessThanOrEqual(400);
  });

  // --- Left/top resize boundary enforcement ---

  it('w handle: large positive dx (shrink) stays within boundary', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'w', 1000, 0);
    expect(result.clamped).toBe(true);
    expect(result.resultWidth).toBeGreaterThanOrEqual(1);
    expect(result.resultX!).toBeGreaterThanOrEqual(boundary.x);
    // Right edge must stay fixed at original right
    expect(result.resultX! + result.resultWidth).toBe(elementRect.x + elementRect.width);
  });

  it('w handle: large negative dx (expand left) stays within boundary', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'w', -200, 0);
    expect(result.clamped).toBe(true);
    expect(result.resultX!).toBeGreaterThanOrEqual(boundary.x);
    expect(result.resultWidth).toBeGreaterThanOrEqual(1);
    // Right edge must stay fixed
    expect(result.resultX! + result.resultWidth).toBe(elementRect.x + elementRect.width);
  });

  it('n handle: large positive dy (shrink) stays within boundary', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'n', 0, 1000);
    expect(result.clamped).toBe(true);
    expect(result.resultHeight).toBeGreaterThanOrEqual(1);
    expect(result.resultY!).toBeGreaterThanOrEqual(boundary.y);
    // Bottom edge must stay fixed at original bottom
    expect(result.resultY! + result.resultHeight).toBe(elementRect.y + elementRect.height);
  });

  it('n handle: large negative dy (expand up) stays within boundary', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'n', 0, -200);
    expect(result.clamped).toBe(true);
    expect(result.resultY!).toBeGreaterThanOrEqual(boundary.y);
    // Bottom edge must stay fixed
    expect(result.resultY! + result.resultHeight).toBe(elementRect.y + elementRect.height);
  });

  it('nw handle: large dx/dy keeps both x and y within boundary', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'nw', -500, -500);
    expect(result.clamped).toBe(true);
    expect(result.resultX!).toBeGreaterThanOrEqual(boundary.x);
    expect(result.resultY!).toBeGreaterThanOrEqual(boundary.y);
    expect(result.resultWidth).toBeGreaterThanOrEqual(1);
    expect(result.resultHeight).toBeGreaterThanOrEqual(1);
    // Both opposite edges must stay fixed
    expect(result.resultX! + result.resultWidth).toBe(elementRect.x + elementRect.width);
    expect(result.resultY! + result.resultHeight).toBe(elementRect.y + elementRect.height);
  });

  it('nw handle: large positive dx/dy (shrink to min) stays within boundary', () => {
    const result = clampResizeInteraction(elementRect, boundary, 'nw', 500, 500);
    expect(result.clamped).toBe(true);
    expect(result.resultX!).toBeGreaterThanOrEqual(boundary.x);
    expect(result.resultY!).toBeGreaterThanOrEqual(boundary.y);
    expect(result.resultWidth).toBeGreaterThanOrEqual(1);
    expect(result.resultHeight).toBeGreaterThanOrEqual(1);
    // Both opposite edges must stay fixed
    expect(result.resultX! + result.resultWidth).toBe(elementRect.x + elementRect.width);
    expect(result.resultY! + result.resultHeight).toBe(elementRect.y + elementRect.height);
  });

  it('element at boundary edge: w handle expand left is clamped', () => {
    const edgeElement: Rect = { x: 0, y: 0, width: 80, height: 60 };
    const result = clampResizeInteraction(edgeElement, boundary, 'w', -100, 0);
    expect(result.clamped).toBe(true);
    expect(result.resultX!).toBe(0);
    // Right edge must stay fixed
    expect(result.resultX! + result.resultWidth).toBe(edgeElement.x + edgeElement.width);
  });
});
