/**
 * @ui-inspect/webpack-plugin
 *
 * Webpack plugin for ui-inspect
 * Injects browser UI into development builds
 */
import type { UiInspectPluginOptions } from './types.js';
interface WebpackCompiler {
    hooks: {
        compilation: {
            tap: (name: string, callback: (compilation: WebpackCompilation) => void) => void;
        };
    };
}
interface WebpackCompilation {
    hooks: {
        processAssets: {
            tap: (options: {
                name: string;
                stage: number;
            }, callback: (assets: Record<string, WebpackAsset>) => void) => void;
        };
    };
    PROCESS_ASSETS_STAGE_ADDITIONS?: number;
}
interface WebpackAsset {
    source: () => string;
    size: () => number;
}
export interface WebpackUiInspectPluginOptions extends UiInspectPluginOptions {
    /**
     * Enable/disable the plugin
     */
    enabled?: boolean;
}
/**
 * Webpack plugin for ui-inspect
 */
export declare class WebpackUiInspectPlugin {
    private readonly options;
    constructor(options?: WebpackUiInspectPluginOptions);
    /**
     * Apply plugin to webpack compiler
     */
    apply(compiler: WebpackCompiler): void;
    /**
     * Check if ui-inspect should be injected
     */
    private shouldInject;
    /**
     * Inject ui-inspect script into HTML
     */
    private injectUiInspect;
}
/**
 * Create ui-inspect webpack plugin
 */
export declare function uiInspect(options?: WebpackUiInspectPluginOptions): WebpackUiInspectPlugin;
export default WebpackUiInspectPlugin;
//# sourceMappingURL=plugin.d.ts.map