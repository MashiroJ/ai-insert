/**
 * @ui-inspect/rsbuild-plugin
 *
 * Rsbuild plugin for ui-inspect.
 * Registers a Rspack-compatible plugin through Rsbuild's modifyRspackConfig hook.
 */
import { readFileSync } from 'node:fs';
export const RSBUILD_PLUGIN_NAME = 'ui-inspect:rsbuild';
const RSPACK_PLUGIN_NAME = '@ui-inspect/rsbuild-plugin:rspack';
const CLIENT_PATH = '/@ui-inspect/client.js';
const DIANA_PATH = '/@ui-inspect/diana.webp';
const DEFAULT_DAEMON_URL = 'http://127.0.0.1:17321';
const browserRuntimeSpecifier = '@ui-inspect/browser-ui/plugin-runtime';
let browserRuntime = null;
function loadBrowserRuntime() {
    browserRuntime = browserRuntime || import(browserRuntimeSpecifier);
    return browserRuntime;
}
async function sendClientScript(res, options) {
    const { clientSource } = await loadBrowserRuntime();
    const clientScript = clientSource({
        daemonUrl: options.daemonUrl,
        root: options.root,
    });
    res.setHeader('content-type', 'application/javascript; charset=utf-8');
    res.end(clientScript);
}
async function sendDianaAsset(res) {
    const { getDianaAssetPath } = await loadBrowserRuntime();
    let dianaBuffer = null;
    try {
        dianaBuffer = readFileSync(getDianaAssetPath());
    }
    catch { /* sprite optional */ }
    res.setHeader('content-type', 'image/webp');
    res.end(dianaBuffer ?? Buffer.alloc(0));
}
class RsbuildUiInspectRspackPlugin {
    constructor(options) {
        this.options = options;
    }
    apply(compiler) {
        this.setupDevServerMiddleware(compiler);
        if (compiler.options.mode !== 'production') {
            this.injectScriptIntoHtml(compiler);
        }
    }
    setupDevServerMiddleware(compiler) {
        const devServer = compiler.options.devServer;
        if (!devServer)
            return;
        const originalSetup = devServer.setupMiddlewares;
        const plugin = this;
        devServer.setupMiddlewares = function (middlewares, devServer) {
            if (devServer.app) {
                devServer.app.get?.(CLIENT_PATH, async (_req, res) => {
                    await sendClientScript(res, plugin.options);
                });
                devServer.app.get?.(DIANA_PATH, async (_req, res) => {
                    await sendDianaAsset(res);
                });
            }
            return originalSetup ? originalSetup(middlewares, devServer) : middlewares;
        };
    }
    injectScriptIntoHtml(compiler) {
        compiler.hooks.compilation.tap(RSPACK_PLUGIN_NAME, (compilation) => {
            const stage = compilation.PROCESS_ASSETS_STAGE_ADDITIONS ?? 1000;
            compilation.hooks.processAssets.tap({ name: RSPACK_PLUGIN_NAME, stage }, (assets) => {
                for (const assetName of Object.keys(assets)) {
                    if (!assetName.endsWith('.html'))
                        continue;
                    const asset = assets[assetName];
                    if (!asset || typeof asset.source !== 'function')
                        continue;
                    const html = asset.source();
                    if (html.includes(`src="${CLIENT_PATH}"`))
                        continue;
                    const script = `<script type="module" src="${CLIENT_PATH}"></script>`;
                    const bodyClose = html.match(/<\/body>/i);
                    const injected = bodyClose
                        ? html.slice(0, bodyClose.index) + script + html.slice(bodyClose.index)
                        : html + script;
                    assets[assetName] = { source: () => injected, size: () => injected.length };
                }
            });
        });
    }
}
function resolveRoot(api, options) {
    if (options.root)
        return options.root;
    const normalized = api.getNormalizedConfig?.();
    return normalized?.source?.root
        || normalized?.root
        || api.context?.rootPath
        || api.context?.cwd
        || process.cwd();
}
export function pluginUiInspect(options = {}) {
    return {
        name: RSBUILD_PLUGIN_NAME,
        setup(api) {
            if (options.enabled === false)
                return;
            const resolvedOptions = () => ({
                daemonUrl: options.daemonUrl || DEFAULT_DAEMON_URL,
                root: resolveRoot(api, options),
                enabled: true,
            });
            api.onBeforeStartDevServer?.(({ server }) => {
                server.middlewares?.use(CLIENT_PATH, (_req, res, next) => {
                    void sendClientScript(res, resolvedOptions()).catch(next);
                });
                server.middlewares?.use(DIANA_PATH, (_req, res, next) => {
                    void sendDianaAsset(res).catch(next);
                });
            });
            api.modifyRspackConfig((config, context) => {
                if (context?.env === 'production' || config.mode === 'production')
                    return config;
                config.plugins = config.plugins || [];
                config.plugins.push(new RsbuildUiInspectRspackPlugin(resolvedOptions()));
                return config;
            });
        },
    };
}
export const uiInspect = pluginUiInspect;
export default pluginUiInspect;
//# sourceMappingURL=plugin.js.map