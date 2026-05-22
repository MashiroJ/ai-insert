/**
 * @ui-inspect/webpack-plugin
 *
 * Webpack plugin for ui-inspect
 * Injects browser UI into development builds
 */

import type { UiInspectPluginOptions } from './types.js';

const PLUGIN_NAME = '@ui-inspect/webpack-plugin';

// Webpack types (optional)
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
      tap: (options: { name: string; stage: number }, callback: (assets: Record<string, WebpackAsset>) => void) => void;
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
export class WebpackUiInspectPlugin {
  private readonly options: Required<WebpackUiInspectPluginOptions>;

  constructor(options: WebpackUiInspectPluginOptions = {}) {
    this.options = {
      daemonUrl: options.daemonUrl || 'http://127.0.0.1:17321',
      root: options.root || process.cwd(),
      enabled: options.enabled !== false,
    };
  }

  /**
   * Apply plugin to webpack compiler
   */
  apply(compiler: WebpackCompiler): void {
    if (!this.options.enabled) {
      return;
    }

    const pluginName = this.constructor.name || PLUGIN_NAME;

    compiler.hooks.compilation.tap(pluginName, (compilation: WebpackCompilation) => {
      // Inject ui-inspect into HTML documents
      const stage = compilation.PROCESS_ASSETS_STAGE_ADDITIONS ?? 1000;

      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage,
        },
        (assets: Record<string, WebpackAsset>) => {
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
              } as typeof asset;
            }
          });
        }
      );
    });
  }

  /**
   * Check if ui-inspect should be injected
   */
  private shouldInject(html: string): boolean {
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
  private injectUiInspect(html: string): string {
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
export function uiInspect(options?: WebpackUiInspectPluginOptions): WebpackUiInspectPlugin {
  return new WebpackUiInspectPlugin(options);
}

// Export default plugin
export default WebpackUiInspectPlugin;
