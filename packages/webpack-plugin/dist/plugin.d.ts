/**
 * @ui-inspect/webpack-plugin
 *
 * Webpack plugin for ui-inspect.
 * Injects browser UI into development builds served by webpack-dev-server.
 */
import type { UiInspectPluginOptions } from './types.js';
interface WebpackCompiler {
    options: {
        mode?: string;
        devServer?: Record<string, unknown> & {
            setupMiddlewares?: (middlewares: WebpackMiddleware[], devServer: WebpackDevServer) => WebpackMiddleware[];
        };
        [key: string]: unknown;
    };
    hooks: {
        compilation: {
            tap: (name: string, fn: (c: WebpackCompilation) => void) => void;
        };
        [key: string]: unknown;
    };
}
interface WebpackCompilation {
    hooks: {
        processAssets: {
            tap: (opts: {
                name: string;
                stage: number;
            }, fn: (assets: Record<string, WebpackAsset>) => void) => void;
        };
    };
    PROCESS_ASSETS_STAGE_ADDITIONS?: number;
}
interface WebpackAsset {
    source: () => string;
    size: () => number;
}
interface WebpackMiddleware {
    [key: string]: unknown;
}
interface WebpackResponse {
    setHeader(k: string, v: string): void;
    end(d?: string | Buffer): void;
}
interface WebpackDevServer {
    app?: {
        get?(path: string, handler: (req: unknown, res: WebpackResponse) => void): void;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
export interface WebpackUiInspectPluginOptions extends UiInspectPluginOptions {
    enabled?: boolean;
}
export declare class WebpackUiInspectPlugin {
    private readonly options;
    constructor(options?: WebpackUiInspectPluginOptions);
    apply(compiler: WebpackCompiler): void;
    private setupDevServerMiddleware;
    private injectScriptIntoHtml;
}
export declare function uiInspect(options?: WebpackUiInspectPluginOptions): WebpackUiInspectPlugin;
export default WebpackUiInspectPlugin;
//# sourceMappingURL=plugin.d.ts.map