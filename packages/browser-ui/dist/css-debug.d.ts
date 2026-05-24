export interface CssDebugChangedStyle {
    originalValue: string;
    previewValue: string;
}
export type CssDebugStyleMap = Record<string, string>;
export type CssDebugChangedStyles = Record<string, CssDebugChangedStyle>;
export declare const CSS_DEBUG_PROPERTIES: readonly ["margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "gap", "width", "height", "min-width", "max-width", "min-height", "max-height", "display", "flex-direction", "align-items", "justify-content", "font-size", "font-weight", "line-height", "letter-spacing", "color", "background-color", "border", "border-radius", "box-shadow", "opacity", "transform"];
export declare function createCssDebugDiff(originalStyles: CssDebugStyleMap, previewStyles: CssDebugStyleMap, activeProperties?: Iterable<string>): CssDebugChangedStyles;
export declare function createCssDebugComputedEffects(originalStyles: CssDebugStyleMap, previewStyles: CssDebugStyleMap, activeProperties: Iterable<string>): {
    self: CssDebugChangedStyles;
};
//# sourceMappingURL=css-debug.d.ts.map