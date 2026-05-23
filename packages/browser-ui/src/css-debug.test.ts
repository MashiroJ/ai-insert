import { describe, expect, it } from 'vitest';
import { CSS_DEBUG_PROPERTIES, createCssDebugComputedEffects, createCssDebugDiff } from './css-debug.js';

describe('createCssDebugDiff', () => {
  it('only includes changed CSS debug properties', () => {
    const diff = createCssDebugDiff(
      {
        padding: '8px',
        margin: '0px',
        color: 'rgb(15, 23, 42)',
      },
      {
        padding: '12px',
        margin: '0px',
        color: 'rgb(15, 23, 42)',
      },
    );

    expect(diff).toEqual({
      padding: { originalValue: '8px', previewValue: '12px' },
    });
  });

  it('keeps user changes separate from computed side effects', () => {
    const original = {
      padding: '8px',
      width: '320px',
      height: '64px',
      'font-size': '16px',
    };
    const preview = {
      padding: '16px',
      width: '304px',
      height: '72px',
      'font-size': '18px',
    };

    expect(createCssDebugDiff(original, preview, ['padding', 'font-size'])).toEqual({
      padding: { originalValue: '8px', previewValue: '16px' },
      'font-size': { originalValue: '16px', previewValue: '18px' },
    });
    expect(createCssDebugComputedEffects(original, preview, ['padding', 'font-size']).self).toEqual({
      width: { originalValue: '320px', previewValue: '304px' },
      height: { originalValue: '64px', previewValue: '72px' },
    });
  });

  it('tracks supported MVP properties', () => {
    expect(CSS_DEBUG_PROPERTIES).toEqual([
      'margin',
      'padding',
      'gap',
      'width',
      'height',
      'min-width',
      'max-width',
      'min-height',
      'max-height',
      'display',
      'flex-direction',
      'align-items',
      'justify-content',
      'font-size',
      'font-weight',
      'line-height',
      'color',
      'background-color',
      'border',
      'border-radius',
      'box-shadow',
      'opacity',
      'transform',
    ]);
  });
});
