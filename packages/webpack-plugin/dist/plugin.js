/**
 * @ui-inspect/webpack-plugin
 *
 * Webpack plugin for ui-inspect.
 * Injects browser UI into development builds served by webpack-dev-server.
 */
import { readFileSync } from 'node:fs';
import { clientSource, getDianaAssetPath } from '@ui-inspect/browser-ui/plugin-runtime';
const PLUGIN_NAME = '@ui-inspect/webpack-plugin';
const CLIENT_PATH = '/@ui-inspect/client.js';
const DIANA_PATH = '/@ui-inspect/diana.webp';
const DEFAULT_DAEMON_URL = 'http://127.0.0.1:17321';
export class WebpackUiInspectPlugin {
    constructor(options = {}) {
        this.options = {
            daemonUrl: options.daemonUrl || DEFAULT_DAEMON_URL,
            root: options.root || process.cwd(),
            enabled: options.enabled !== false,
        };
    }
    apply(compiler) {
        if (!this.options.enabled)
            return;
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
            const clientScript = clientSource({
                daemonUrl: plugin.options.daemonUrl,
                root: plugin.options.root,
            });
            let dianaBuffer = null;
            try {
                dianaBuffer = readFileSync(getDianaAssetPath());
            }
            catch { /* sprite optional */ }
            if (devServer.app) {
                devServer.app.get?.(CLIENT_PATH, (_req, res) => {
                    res.setHeader('content-type', 'application/javascript; charset=utf-8');
                    res.end(clientScript);
                });
                devServer.app.get?.(DIANA_PATH, (_req, res) => {
                    res.setHeader('content-type', 'image/webp');
                    res.end(dianaBuffer ?? Buffer.alloc(0));
                });
            }
            return originalSetup ? originalSetup(middlewares, devServer) : middlewares;
        };
    }
    injectScriptIntoHtml(compiler) {
        const pluginName = this.constructor.name || PLUGIN_NAME;
        compiler.hooks.compilation.tap(pluginName, (compilation) => {
            const stage = compilation.PROCESS_ASSETS_STAGE_ADDITIONS ?? 1000;
            compilation.hooks.processAssets.tap({ name: pluginName, stage }, (assets) => {
                for (const assetName of Object.keys(assets)) {
                    if (!assetName.endsWith('.html'))
                        continue;
                    const asset = assets[assetName];
                    if (!asset || typeof asset.source !== 'function')
                        continue;
                    const html = asset.source();
                    // Avoid double-injection by checking for our client script tag
                    if (html.includes(`src="${CLIENT_PATH}"`))
                        continue;
                    const script = `<script type="module" src="${CLIENT_PATH}"></script>`;
                    // Case-insensitive </body> match
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
export function uiInspect(options) {
    return new WebpackUiInspectPlugin(options);
}
export default WebpackUiInspectPlugin;
//# sourceMappingURL=plugin.js.map