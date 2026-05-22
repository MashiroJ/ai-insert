/**
 * @ui-inspect/webpack-plugin
 *
 * Webpack plugin for ui-inspect.
 * Injects browser UI into development builds served by webpack-dev-server.
 */

import { readFileSync } from 'node:fs';
import { clientSource, getDianaAssetPath } from '@ui-inspect/browser-ui/plugin-runtime';
import type { UiInspectPluginOptions } from './types.js';

const PLUGIN_NAME = '@ui-inspect/webpack-plugin';

const CLIENT_PATH = '/@ui-inspect/client.js';
const DIANA_PATH = '/@ui-inspect/diana.webp';
const DEFAULT_DAEMON_URL = 'http://127.0.0.1:17321';

// Minimal webpack type surface (peer dependency is optional)
interface WebpackCompiler {
  options: {
    mode?: string;
    devServer?: Record<string, unknown> & {
      setupMiddlewares?: (middlewares: WebpackMiddleware[], devServer: WebpackDevServer) => WebpackMiddleware[];
    };
    [key: string]: unknown;
  };
  hooks: {
    compilation: { tap: (name: string, fn: (c: WebpackCompilation) => void) => void };
    [key: string]: unknown;
  };
}

interface WebpackCompilation {
  hooks: {
    processAssets: {
      tap: (opts: { name: string; stage: number }, fn: (assets: Record<string, WebpackAsset>) => void) => void;
    };
  };
  PROCESS_ASSETS_STAGE_ADDITIONS?: number;
}

interface WebpackAsset { source: () => string; size: () => number }

interface WebpackMiddleware { [key: string]: unknown }
interface WebpackResponse { setHeader(k: string, v: string): void; end(d?: string | Buffer): void }
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

export class WebpackUiInspectPlugin {
  private readonly options: Required<WebpackUiInspectPluginOptions>;

  constructor(options: WebpackUiInspectPluginOptions = {}) {
    this.options = {
      daemonUrl: options.daemonUrl || DEFAULT_DAEMON_URL,
      root: options.root || process.cwd(),
      enabled: options.enabled !== false,
    };
  }

  apply(compiler: WebpackCompiler): void {
    if (!this.options.enabled) return;

    this.setupDevServerMiddleware(compiler);
    if (compiler.options.mode !== 'production') {
      this.injectScriptIntoHtml(compiler);
    }
  }

  private setupDevServerMiddleware(compiler: WebpackCompiler): void {
    const devServer = compiler.options.devServer;
    if (!devServer) return;

    const originalSetup = devServer.setupMiddlewares;
    const plugin = this;

    devServer.setupMiddlewares = function (middlewares: WebpackMiddleware[], devServer: WebpackDevServer): WebpackMiddleware[] {
      const clientScript = clientSource({
        daemonUrl: plugin.options.daemonUrl,
        root: plugin.options.root,
      });

      let dianaBuffer: Buffer | null = null;
      try { dianaBuffer = readFileSync(getDianaAssetPath()); } catch { /* sprite optional */ }

      if (devServer.app) {
        devServer.app.get?.(CLIENT_PATH, (_req: unknown, res: WebpackResponse) => {
          res.setHeader('content-type', 'application/javascript; charset=utf-8');
          res.end(clientScript);
        });

        devServer.app.get?.(DIANA_PATH, (_req: unknown, res: WebpackResponse) => {
          res.setHeader('content-type', 'image/webp');
          res.end(dianaBuffer ?? Buffer.alloc(0));
        });
      }

      return originalSetup ? originalSetup(middlewares, devServer) : middlewares;
    };
  }

  private injectScriptIntoHtml(compiler: WebpackCompiler): void {
    const pluginName = this.constructor.name || PLUGIN_NAME;

    compiler.hooks.compilation.tap(pluginName, (compilation: WebpackCompilation) => {
      const stage = compilation.PROCESS_ASSETS_STAGE_ADDITIONS ?? 1000;

      compilation.hooks.processAssets.tap({ name: pluginName, stage }, (assets: Record<string, WebpackAsset>) => {
        for (const assetName of Object.keys(assets)) {
          if (!assetName.endsWith('.html')) continue;

          const asset = assets[assetName];
          if (!asset || typeof asset.source !== 'function') continue;

          const html = asset.source();

          // Avoid double-injection by checking for our client script tag
          if (html.includes(`src="${CLIENT_PATH}"`)) continue;

          const script = `<script type="module" src="${CLIENT_PATH}"></script>`;

          // Case-insensitive </body> match
          const bodyClose = html.match(/<\/body>/i);
          const injected = bodyClose
            ? html.slice(0, bodyClose.index) + script + html.slice(bodyClose.index)
            : html + script;

          assets[assetName] = { source: () => injected, size: () => injected.length } as typeof asset;
        }
      });
    });
  }
}

export function uiInspect(options?: WebpackUiInspectPluginOptions): WebpackUiInspectPlugin {
  return new WebpackUiInspectPlugin(options);
}

export default WebpackUiInspectPlugin;
