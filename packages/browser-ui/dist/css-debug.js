export const CSS_DEBUG_PROPERTIES = [
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
];
export function createCssDebugDiff(originalStyles, previewStyles, activeProperties = CSS_DEBUG_PROPERTIES) {
    const out = {};
    Array.from(activeProperties).forEach((property) => {
        const before = originalStyles[property] ?? '';
        const after = previewStyles[property] ?? '';
        if (before !== after) {
            out[property] = { originalValue: before, previewValue: after };
        }
    });
    return out;
}
export function createCssDebugComputedEffects(originalStyles, previewStyles, activeProperties) {
    const active = new Set(activeProperties);
    const passiveProperties = CSS_DEBUG_PROPERTIES.filter((property) => !active.has(property));
    return {
        self: createCssDebugDiff(originalStyles, previewStyles, passiveProperties),
    };
}
//# sourceMappingURL=css-debug.js.map