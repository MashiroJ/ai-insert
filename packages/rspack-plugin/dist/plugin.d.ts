/**
 * @ui-inspect/rspack-plugin
 *
 * Rspack plugin for ui-inspect.
 * Injects browser UI into development builds served by rspack-dev-server.
 */
import type { UiInspectPluginOptions } from './types.js';
interface RspackCompiler {
    options: {
        mode?: string;
        devServer?: Record<string, unknown> & {
            setupMiddlewares?: (middlewares: RspackMiddleware[], devServer: RspackDevServer) => RspackMiddleware[];
        };
        [key: string]: unknown;
    };
    hooks: {
        compilation: {
            tap: (name: string, fn: (c: RspackCompilation) => void) => void;
        };
        [key: string]: unknown;
    };
}
interface RspackCompilation {
    hooks: {
        processAssets: {
            tap: (opts: {
                name: string;
                stage: number;
            }, fn: (assets: Record<string, RspackAsset>) => void) => void;
        };
    };
    PROCESS_ASSETS_STAGE_ADDITIONS?: number;
}
interface RspackAsset {
    source: () => string;
    size: () => number;
}
interface RspackMiddleware {
    [key: string]: unknown;
}
interface RspackResponse {
    setHeader(k: string, v: string): void;
    end(d?: string | Buffer): void;
}
interface RspackDevServer {
    app?: {
        get?(path: string, handler: (req: unknown, res: RspackResponse) => void): void;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
export interface RspackUiInspectPluginOptions extends UiInspectPluginOptions {
}
export declare class RspackUiInspectPlugin {
    private readonly options;
    constructor(options?: RspackUiInspectPluginOptions);
    apply(compiler: RspackCompiler): void;
    private setupDevServerMiddleware;
    private injectScriptIntoHtml;
}
export declare function uiInspect(options?: RspackUiInspectPluginOptions): RspackUiInspectPlugin;
export default RspackUiInspectPlugin;
//# sourceMappingURL=plugin.d.ts.map