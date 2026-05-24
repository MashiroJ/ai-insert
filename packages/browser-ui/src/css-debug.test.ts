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
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
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
      'letter-spacing',
      'color',
      'background-color',
      'border',
      'border-radius',
      'box-shadow',
      'opacity',
      'transform',
    ]);
  });

  it('captures keyboard nudge properties in changedStyles', () => {
    const diff = createCssDebugDiff(
      {
        'margin-top': '0px',
        'margin-right': '0px',
        'margin-bottom': '0px',
        'margin-left': '0px',
        'padding-top': '0px',
        'padding-right': '0px',
        'padding-bottom': '0px',
        'padding-left': '0px',
        'letter-spacing': '0px',
        width: '100px',
      },
      {
        'margin-top': '1px',
        'margin-right': '0px',
        'margin-bottom': '0px',
        'margin-left': '0px',
        'padding-top': '0px',
        'padding-right': '0px',
        'padding-bottom': '0px',
        'padding-left': '2px',
        'letter-spacing': '0.5px',
        width: '100px',
      },
    );

    expect(diff).toEqual({
      'margin-top': { originalValue: '0px', previewValue: '1px' },
      'padding-left': { originalValue: '0px', previewValue: '2px' },
      'letter-spacing': { originalValue: '0px', previewValue: '0.5px' },
    });
  });

  it('separates keyboard nudge active properties from side effects', () => {
    const original = {
      'margin-top': '0px',
      'padding-left': '0px',
      'letter-spacing': '0px',
      width: '200px',
      height: '40px',
    };
    const preview = {
      'margin-top': '3px',
      'padding-left': '5px',
      'letter-spacing': '1px',
      width: '192px',
      height: '48px',
    };

    const diff = createCssDebugDiff(original, preview, ['margin-top', 'padding-left', 'letter-spacing']);
    expect(Object.keys(diff)).toEqual(['margin-top', 'padding-left', 'letter-spacing']);

    const effects = createCssDebugComputedEffects(original, preview, ['margin-top', 'padding-left', 'letter-spacing']);
    expect(Object.keys(effects.self)).toEqual(['width', 'height']);
  });
});
