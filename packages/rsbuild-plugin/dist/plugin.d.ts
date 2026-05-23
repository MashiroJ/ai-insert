/**
 * @ui-inspect/rsbuild-plugin
 *
 * Rsbuild plugin for ui-inspect.
 * Registers a Rspack-compatible plugin through Rsbuild's modifyRspackConfig hook.
 */
import type { UiInspectPluginOptions } from './types.js';
export declare const RSBUILD_PLUGIN_NAME = "ui-inspect:rsbuild";
type RspackConfig = {
    mode?: string;
    plugins?: unknown[];
    devServer?: Record<string, unknown> & {
        setupMiddlewares?: (middlewares: RspackMiddleware[], devServer: RspackDevServer) => RspackMiddleware[];
    };
    [key: string]: unknown;
};
type ModifyRspackConfigContext = {
    env?: string;
    [key: string]: unknown;
};
type RsbuildNormalizedConfig = {
    root?: string;
    source?: {
        root?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
};
type RsbuildPluginAPI = {
    context?: {
        rootPath?: string;
        cwd?: string;
        [key: string]: unknown;
    };
    getNormalizedConfig?: () => RsbuildNormalizedConfig;
    modifyRspackConfig: (modifier: (config: RspackConfig, context?: ModifyRspackConfigContext) => RspackConfig | void) => void;
    onBeforeStartDevServer?: (handler: (params: {
        server: RsbuildDevServer;
    }) => void | Promise<void>) => void;
};
export type RsbuildPlugin = {
    name: string;
    setup: (api: RsbuildPluginAPI) => void;
};
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
interface RsbuildResponse {
    setHeader(k: string, v: string): void;
    end(d?: string | Buffer): void;
}
interface RsbuildDevServer {
    middlewares?: {
        use(path: string, handler: (req: unknown, res: RsbuildResponse, next: (err?: unknown) => void) => void): void;
    };
}
export declare function pluginUiInspect(options?: UiInspectPluginOptions): RsbuildPlugin;
export declare const uiInspect: typeof pluginUiInspect;
export default pluginUiInspect;
//# sourceMappingURL=plugin.d.ts.map