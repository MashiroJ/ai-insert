/**
 * @ui-inspect/webpack-plugin
 *
 * Webpack plugin for ui-inspect
 * Injects browser UI into development builds
 */
const PLUGIN_NAME = '@ui-inspect/webpack-plugin';
/**
 * Webpack plugin for ui-inspect
 */
export class WebpackUiInspectPlugin {
    constructor(options = {}) {
        this.options = {
            daemonUrl: options.daemonUrl || 'http://127.0.0.1:17321',
            root: options.root || process.cwd(),
            enabled: options.enabled !== false,
        };
    }
    /**
     * Apply plugin to webpack compiler
     */
    apply(compiler) {
        if (!this.options.enabled) {
            return;
        }
        const pluginName = this.constructor.name || PLUGIN_NAME;
        compiler.hooks.compilation.tap(pluginName, (compilation) => {
            // Inject ui-inspect into HTML documents
            const stage = compilation.PROCESS_ASSETS_STAGE_ADDITIONS ?? 1000;
            compilation.hooks.processAssets.tap({
                name: pluginName,
                stage,
            }, (assets) => {
                Object.keys(assets).forEach((assetName) => {
                    if (!assetName.endsWith('.html')) {
                        return;
                    }
                    const asset = assets[assetName];
                    if (!asset || typeof asset.source !== 'function') {
                        return;
                    }
                    const source = asset.source();
                    // Only inject in development mode
                    if (!this.shouldInject(source)) {
                        return;
                    }
                    // Inject the ui-inspect script
                    const injected = this.injectUiInspect(source);
                    if (injected !== source) {
                        assets[assetName] = {
                            source: () => injected,
                            size: () => injected.length,
                        };
                    }
                });
            });
        });
    }
    /**
     * Check if ui-inspect should be injected
     */
    shouldInject(html) {
        // Don't inject if already present
        if (html.includes('ui-inspect')) {
            return false;
        }
        // Only inject in development-like environments
        const hasDevScript = html.includes('webpack-dev-server') ||
            html.includes('hot-module-replacement');
        return hasDevScript;
    }
    /**
     * Inject ui-inspect script into HTML
     */
    injectUiInspect(html) {
        // Import the client modules (similar to vite-plugin)
        // For now, this is a placeholder implementation
        const script = `
<script>
(function() {
  const DAEMON_URL = ${JSON.stringify(this.options.daemonUrl)};
  const PROJECT_ROOT = ${JSON.stringify(this.options.root)};

  // ui-inspect client code would be injected here
  console.log('[ui-inspect] Webpack plugin active', { DAEMON_URL, PROJECT_ROOT });
})();
</script>`;
        // Inject before closing </body>
        const closingBody = html.match(/<\/body>/i);
        if (closingBody) {
            return html.replace(/<\/body>/i, `${script}</body>`);
        }
        // Fallback: append to end
        return html + script;
    }
}
/**
 * Create ui-inspect webpack plugin
 */
export function uiInspect(options) {
    return new WebpackUiInspectPlugin(options);
}
// Export default plugin
export default WebpackUiInspectPlugin;
//# sourceMappingURL=plugin.js.map