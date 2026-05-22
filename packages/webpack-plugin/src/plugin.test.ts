import { describe, it, expect } from 'vitest';
import { WebpackUiInspectPlugin, uiInspect } from './plugin.js';

const CLIENT_PATH = '/@ui-inspect/client.js';

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

describe('WebpackUiInspectPlugin', () => {
  describe('HTML injection', () => {
    it('injects script before </body>', () => {
      const plugin = new WebpackUiInspectPlugin();
      const compiler = mockCompiler('<html><body><div id="app"></div></body></html>');
      plugin.apply(compiler as any);
      const result = compiler._run();
      expect(result).toContain(`src="${CLIENT_PATH}"`);
      expect(result).toMatch(new RegExp(`<script[^>]*src="${CLIENT_PATH.replace('/', '\\/')}"[^>]*></script></body>`, 'i'));
    });

    it('handles uppercase </BODY>', () => {
      const plugin = new WebpackUiInspectPlugin();
      const compiler = mockCompiler('<html><BODY><div></div></BODY></html>');
      plugin.apply(compiler as any);
      const result = compiler._run();
      expect(result).toContain(`src="${CLIENT_PATH}"`);
    });

    it('handles mixed-case </Body>', () => {
      const plugin = new WebpackUiInspectPlugin();
      const compiler = mockCompiler('<html><Body><div></div></Body></html>');
      plugin.apply(compiler as any);
      const result = compiler._run();
      expect(result).toContain(`src="${CLIENT_PATH}"`);
    });

    it('appends script when no </body> tag exists', () => {
      const plugin = new WebpackUiInspectPlugin();
      const compiler = mockCompiler('<html><div></div></html>');
      plugin.apply(compiler as any);
      const result = compiler._run();
      expect(result).toContain(`src="${CLIENT_PATH}"`);
      expect(result).toMatch(/<\/html>/);
    });
  });

  describe('no duplicate injection', () => {
    it('skips injection if client script tag already present', () => {
      const plugin = new WebpackUiInspectPlugin();
      const existingHtml = `<html><body><script type="module" src="${CLIENT_PATH}"></script></body></html>`;
      const compiler = mockCompiler(existingHtml);
      plugin.apply(compiler as any);
      const result = compiler._run();
      const count = (result.match(new RegExp(CLIENT_PATH.replace('/', '\\/'), 'g')) || []).length;
      expect(count).toBe(1);
    });
  });

  describe('disabled plugin', () => {
    it('does not inject when enabled=false', () => {
      const plugin = new WebpackUiInspectPlugin({ enabled: false });
      const compiler = mockCompiler('<html><body></body></html>');
      plugin.apply(compiler as any);
      const result = compiler._run();
      expect(result).not.toContain(CLIENT_PATH);
    });
  });

  describe('production mode', () => {
    it('does not inject into production HTML assets', () => {
      const plugin = new WebpackUiInspectPlugin();
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

      const plugin = new WebpackUiInspectPlugin();
      const compiler = mockCompiler('<html><body></body></html>', { setupMiddlewares: original });
      plugin.apply(compiler as any);

      const wrappedSetup = compiler.options.devServer!.setupMiddlewares! as (mws: unknown[], ds: unknown) => unknown[];
      const mockDevServer = { app: { get: () => {} } };
      wrappedSetup([], mockDevServer);

      expect(callLog).toEqual(['original']);
    });

    it('works without an existing setupMiddlewares', () => {
      const plugin = new WebpackUiInspectPlugin();
      const compiler = mockCompiler('<html><body></body></html>', {});
      plugin.apply(compiler as any);

      expect(compiler.options.devServer!.setupMiddlewares).toBeDefined();
    });
  });

  describe('uiInspect factory', () => {
    it('returns a WebpackUiInspectPlugin instance', () => {
      const plugin = uiInspect();
      expect(plugin).toBeInstanceOf(WebpackUiInspectPlugin);
    });
  });
});
