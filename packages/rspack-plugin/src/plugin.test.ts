import { describe, it, expect } from 'vitest';
import DefaultRspackUiInspectPlugin from './index.js';
import { RspackUiInspectPlugin, uiInspect } from './plugin.js';

const CLIENT_PATH = '/@ui-inspect/client.js';
const DIANA_PATH = '/@ui-inspect/diana.webp';

function mockAssets(html: string) {
  return { 'index.html': { source: () => html, size: () => html.length } };
}

function mockCompilation(assets: Record<string, { source: () => string; size: () => number }>) {
  const taps: Array<{ opts: { name: string; stage: number }; fn: (assets: Record<string, { source: () => string; size: () => number }>) => void }> = [];
  return {
    hooks: {
      processAssets: {
        tap(opts: { name: string; stage: number }, fn: (assets: Record<string, { source: () => string; size: () => number }>) => void) {
          taps.push({ opts, fn });
        },
      },
    },
    PROCESS_ASSETS_STAGE_ADDITIONS: 1000,
    _run(assetsOverride?: Record<string, { source: () => string; size: () => number }>) {
      taps.forEach((t) => t.fn(assetsOverride ?? assets));
    },
  };
}

function mockCompiler(html: string, devServer?: Record<string, unknown>) {
  let compilationFn: ((c: ReturnType<typeof mockCompilation>) => void) | null = null;
  const assets = mockAssets(html);
  const comp = mockCompilation(assets);

  return {
    options: {
      mode: 'development' as string | undefined,
      devServer: devServer ?? {},
    },
    hooks: {
      compilation: {
        tap(_name: string, fn: (c: ReturnType<typeof mockCompilation>) => void) {
          compilationFn = fn;
        },
      },
    },
    _run() {
      if (compilationFn) compilationFn(comp);
      comp._run();
      return assets['index.html'].source();
    },
  };
}

describe('RspackUiInspectPlugin', () => {
  describe('HTML injection', () => {
    it('injects script before </body>', () => {
      const plugin = new RspackUiInspectPlugin();
      const compiler = mockCompiler('<html><body><div id="app"></div></body></html>');
      plugin.apply(compiler as any);
      const result = compiler._run();
      expect(result).toContain(`src="${CLIENT_PATH}"`);
      expect(result).toMatch(new RegExp(`<script[^>]*src="${CLIENT_PATH.replace('/', '\\/')}"[^>]*></script></body>`, 'i'));
    });

    it('handles uppercase </BODY>', () => {
      const plugin = new RspackUiInspectPlugin();
      const compiler = mockCompiler('<html><BODY><div></div></BODY></html>');
      plugin.apply(compiler as any);
      const result = compiler._run();
      expect(result).toContain(`src="${CLIENT_PATH}"`);
      expect(result).toMatch(/<\/BODY>/);
    });

    it('appends script when no </body> tag exists', () => {
      const plugin = new RspackUiInspectPlugin();
      const compiler = mockCompiler('<html><div></div></html>');
      plugin.apply(compiler as any);
      const result = compiler._run();
      expect(result).toContain(`src="${CLIENT_PATH}"`);
      expect(result.endsWith(`<script type="module" src="${CLIENT_PATH}"></script>`)).toBe(true);
    });
  });

  describe('no duplicate injection', () => {
    it('skips injection if client script tag already present', () => {
      const plugin = new RspackUiInspectPlugin();
      const existingHtml = `<html><body><script type="module" src="${CLIENT_PATH}"></script></body></html>`;
      const compiler = mockCompiler(existingHtml);
      plugin.apply(compiler as any);
      const result = compiler._run();
      const count = (result.match(new RegExp(CLIENT_PATH.replace('/', '\\/'), 'g')) || []).length;
      expect(count).toBe(1);
    });
  });

  describe('disabled plugin', () => {
    it('does not inject or register middleware when enabled=false', () => {
      const plugin = new RspackUiInspectPlugin({ enabled: false });
      const compiler = mockCompiler('<html><body></body></html>');
      plugin.apply(compiler as any);
      const result = compiler._run();
      expect(result).not.toContain(CLIENT_PATH);
      expect(compiler.options.devServer!.setupMiddlewares).toBeUndefined();
    });
  });

  describe('production mode', () => {
    it('does not inject into production HTML assets', () => {
      const plugin = new RspackUiInspectPlugin();
      const compiler = mockCompiler('<html><body></body></html>');
      compiler.options.mode = 'production';
      plugin.apply(compiler as any);

      const result = compiler._run();

      expect(result).not.toContain(CLIENT_PATH);
    });
  });

  describe('setupMiddlewares', () => {
    it('preserves original setupMiddlewares function', () => {
      const callLog: string[] = [];
      const original = (mws: unknown[], _devServer: unknown) => {
        callLog.push('original');
        return mws;
      };

      const plugin = new RspackUiInspectPlugin();
      const compiler = mockCompiler('<html><body></body></html>', { setupMiddlewares: original });
      plugin.apply(compiler as any);

      const wrappedSetup = compiler.options.devServer!.setupMiddlewares! as (mws: unknown[], ds: unknown) => unknown[];
      const mockDevServer = { app: { get: () => {} } };
      wrappedSetup([], mockDevServer);

      expect(callLog).toEqual(['original']);
    });

    it('works without an existing setupMiddlewares', () => {
      const plugin = new RspackUiInspectPlugin();
      const compiler = mockCompiler('<html><body></body></html>', {});
      plugin.apply(compiler as any);

      expect(compiler.options.devServer!.setupMiddlewares).toBeDefined();
    });

    it('registers client and Diana resources', () => {
      const routes: Record<string, (req: unknown, res: { setHeader(k: string, v: string): void; end(d?: string | Buffer): void }) => void> = {};
      const plugin = new RspackUiInspectPlugin({ daemonUrl: 'http://127.0.0.1:17321', root: '/tmp/project' });
      const compiler = mockCompiler('<html><body></body></html>', {});
      plugin.apply(compiler as any);

      const wrappedSetup = compiler.options.devServer!.setupMiddlewares! as (mws: unknown[], ds: unknown) => unknown[];
      wrappedSetup([], {
        app: {
          get(path: string, handler: (req: unknown, res: { setHeader(k: string, v: string): void; end(d?: string | Buffer): void }) => void) {
            routes[path] = handler;
          },
        },
      });

      expect(Object.keys(routes).sort()).toEqual([CLIENT_PATH, DIANA_PATH].sort());
    });
  });

  describe('uiInspect factory', () => {
    it('returns a RspackUiInspectPlugin instance', () => {
      const plugin = uiInspect();
      expect(plugin).toBeInstanceOf(RspackUiInspectPlugin);
    });

    it('exports RspackUiInspectPlugin as the package default', () => {
      expect(DefaultRspackUiInspectPlugin).toBe(RspackUiInspectPlugin);
    });
  });
});
