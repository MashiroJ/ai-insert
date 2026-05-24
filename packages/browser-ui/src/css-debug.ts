export interface CssDebugChangedStyle {
  originalValue: string;
  previewValue: string;
}

export type CssDebugStyleMap = Record<string, string>;

export type CssDebugChangedStyles = Record<string, CssDebugChangedStyle>;

export const CSS_DEBUG_PROPERTIES = [
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
] as const;

export function createCssDebugDiff(
  originalStyles: CssDebugStyleMap,
  previewStyles: CssDebugStyleMap,
  activeProperties: Iterable<string> = CSS_DEBUG_PROPERTIES,
): CssDebugChangedStyles {
  const out: CssDebugChangedStyles = {};
  Array.from(activeProperties).forEach((property) => {
    const before = originalStyles[property] ?? '';
    const after = previewStyles[property] ?? '';
    if (before !== after) {
      out[property] = { originalValue: before, previewValue: after };
    }
  });
  return out;
}

export function createCssDebugComputedEffects(
  originalStyles: CssDebugStyleMap,
  previewStyles: CssDebugStyleMap,
  activeProperties: Iterable<string>,
): { self: CssDebugChangedStyles } {
  const active = new Set(activeProperties);
  const passiveProperties = CSS_DEBUG_PROPERTIES.filter((property) => !active.has(property));
  return {
    self: createCssDebugDiff(originalStyles, previewStyles, passiveProperties),
  };
}
