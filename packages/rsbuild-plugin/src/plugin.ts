/**
 * @ui-inspect/rsbuild-plugin
 *
 * Rsbuild plugin for ui-inspect.
 * Registers a Rspack-compatible plugin through Rsbuild's modifyRspackConfig hook.
 */

import { readFileSync } from 'node:fs';
import type { UiInspectPluginOptions } from './types.js';

export const RSBUILD_PLUGIN_NAME = 'ui-inspect:rsbuild';

const RSPACK_PLUGIN_NAME = '@ui-inspect/rsbuild-plugin:rspack';
const CLIENT_PATH = '/@ui-inspect/client.js';
const DIANA_PATH = '/@ui-inspect/diana.webp';
const DEFAULT_DAEMON_URL = 'http://127.0.0.1:17321';

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
  modifyRspackConfig: (
    modifier: (config: RspackConfig, context?: ModifyRspackConfigContext) => RspackConfig | void,
  ) => void;
  onBeforeStartDevServer?: (
    handler: (params: { server: RsbuildDevServer }) => void | Promise<void>,
  ) => void;
};

export type RsbuildPlugin = {
  name: string;
  setup: (api: RsbuildPluginAPI) => void;
};

interface RspackCompiler {
  options: RspackConfig;
  hooks: {
    compilation: { tap: (name: string, fn: (c: RspackCompilation) => void) => void };
    [key: string]: unknown;
  };
}

interface RspackCompilation {
  hooks: {
    processAssets: {
      tap: (opts: { name: string; stage: number }, fn: (assets: Record<string, RspackAsset>) => void) => void;
    };
  };
  PROCESS_ASSETS_STAGE_ADDITIONS?: number;
}

interface RspackAsset { source: () => string; size: () => number }
interface RspackMiddleware { [key: string]: unknown }
interface RspackResponse { setHeader(k: string, v: string): void; end(d?: string | Buffer): void }
interface RspackDevServer {
  app?: {
    get?(path: string, handler: (req: unknown, res: RspackResponse) => void): void;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
interface RsbuildResponse { setHeader(k: string, v: string): void; end(d?: string | Buffer): void }
interface RsbuildDevServer {
  middlewares?: {
    use(path: string, handler: (req: unknown, res: RsbuildResponse, next: (err?: unknown) => void) => void): void;
  };
}

type ResolvedOptions = Required<UiInspectPluginOptions>;

type BrowserRuntime = {
  clientSource: (options: { daemonUrl: string; root: string }) => string;
  getDianaAssetPath: () => string;
};

const browserRuntimeSpecifier = '@ui-inspect/browser-ui/plugin-runtime';
let browserRuntime: Promise<BrowserRuntime> | null = null;

function loadBrowserRuntime(): Promise<BrowserRuntime> {
  browserRuntime = browserRuntime || import(browserRuntimeSpecifier) as Promise<BrowserRuntime>;
  return browserRuntime;
}

async function sendClientScript(res: { setHeader(k: string, v: string): void; end(d?: string | Buffer): void }, options: ResolvedOptions): Promise<void> {
  const { clientSource } = await loadBrowserRuntime();
  const clientScript = clientSource({
    daemonUrl: options.daemonUrl,
    root: options.root,
  });

  res.setHeader('content-type', 'application/javascript; charset=utf-8');
  res.end(clientScript);
}

async function sendDianaAsset(res: { setHeader(k: string, v: string): void; end(d?: string | Buffer): void }): Promise<void> {
  const { getDianaAssetPath } = await loadBrowserRuntime();
  let dianaBuffer: Buffer | null = null;
  try { dianaBuffer = readFileSync(getDianaAssetPath()); } catch { /* sprite optional */ }

  res.setHeader('content-type', 'image/webp');
  res.end(dianaBuffer ?? Buffer.alloc(0));
}

class RsbuildUiInspectRspackPlugin {
  private readonly options: ResolvedOptions;

  constructor(options: ResolvedOptions) {
    this.options = options;
  }

  apply(compiler: RspackCompiler): void {
    this.setupDevServerMiddleware(compiler);
    if (compiler.options.mode !== 'production') {
      this.injectScriptIntoHtml(compiler);
    }
  }

  private setupDevServerMiddleware(compiler: RspackCompiler): void {
    const devServer = compiler.options.devServer;
    if (!devServer) return;

    const originalSetup = devServer.setupMiddlewares;
    const plugin = this;

    devServer.setupMiddlewares = function (middlewares: RspackMiddleware[], devServer: RspackDevServer): RspackMiddleware[] {
      if (devServer.app) {
        devServer.app.get?.(CLIENT_PATH, async (_req: unknown, res: RspackResponse) => {
          await sendClientScript(res, plugin.options);
        });

        devServer.app.get?.(DIANA_PATH, async (_req: unknown, res: RspackResponse) => {
          await sendDianaAsset(res);
        });
      }

      return originalSetup ? originalSetup(middlewares, devServer) : middlewares;
    };
  }

  private injectScriptIntoHtml(compiler: RspackCompiler): void {
    compiler.hooks.compilation.tap(RSPACK_PLUGIN_NAME, (compilation: RspackCompilation) => {
      const stage = compilation.PROCESS_ASSETS_STAGE_ADDITIONS ?? 1000;

      compilation.hooks.processAssets.tap({ name: RSPACK_PLUGIN_NAME, stage }, (assets: Record<string, RspackAsset>) => {
        for (const assetName of Object.keys(assets)) {
          if (!assetName.endsWith('.html')) continue;

          const asset = assets[assetName];
          if (!asset || typeof asset.source !== 'function') continue;

          const html = asset.source();
          if (html.includes(`src="${CLIENT_PATH}"`)) continue;

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

function resolveRoot(api: RsbuildPluginAPI, options: UiInspectPluginOptions): string {
  if (options.root) return options.root;

  const normalized = api.getNormalizedConfig?.();
  return normalized?.source?.root
    || normalized?.root
    || api.context?.rootPath
    || api.context?.cwd
    || process.cwd();
}

export function pluginUiInspect(options: UiInspectPluginOptions = {}): RsbuildPlugin {
  return {
    name: RSBUILD_PLUGIN_NAME,
    setup(api) {
      if (options.enabled === false) return;

      const resolvedOptions = (): ResolvedOptions => ({
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
        if (context?.env === 'production' || config.mode === 'production') return config;

        config.plugins = config.plugins || [];
        config.plugins.push(new RsbuildUiInspectRspackPlugin(resolvedOptions()));
        return config;
      });
    },
  };
}

export const uiInspect = pluginUiInspect;

export default pluginUiInspect;
