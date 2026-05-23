import { describe, expect, it } from 'vitest';
import pluginUiInspectDefault, { RSBUILD_PLUGIN_NAME, pluginUiInspect, uiInspect } from './plugin.js';

function mockApi(normalizedConfig: Record<string, unknown> = {}) {
  const modifiers: Array<(config: Record<string, unknown>, context?: Record<string, unknown>) => Record<string, unknown> | void> = [];
  const devServerHandlers: Array<(params: { server: { middlewares: { use: (path: string, handler: unknown) => void } } }) => void | Promise<void>> = [];

  return {
    api: {
      context: {
        rootPath: '/workspace/root',
        cwd: '/workspace/cwd',
      },
      getNormalizedConfig: () => normalizedConfig,
      modifyRspackConfig(modifier: (config: Record<string, unknown>, context?: Record<string, unknown>) => Record<string, unknown> | void) {
        modifiers.push(modifier);
      },
      onBeforeStartDevServer(handler: (params: { server: { middlewares: { use: (path: string, handler: unknown) => void } } }) => void | Promise<void>) {
        devServerHandlers.push(handler);
      },
    },
    modifiers,
    devServerHandlers,
  };
}

describe('pluginUiInspect', () => {
  it('returns an Rsbuild plugin with the expected shape and name', () => {
    const plugin = pluginUiInspect();

    expect(plugin.name).toBe(RSBUILD_PLUGIN_NAME);
    expect(plugin.name).toBe('ui-inspect:rsbuild');
    expect(plugin.setup).toEqual(expect.any(Function));
  });

  it('exports uiInspect as an alias', () => {
    expect(uiInspect().name).toBe(RSBUILD_PLUGIN_NAME);
  });

  it('exports pluginUiInspect as the default export', () => {
    expect(pluginUiInspectDefault).toBe(pluginUiInspect);
  });

  it('does not register a Rspack config modifier when disabled', () => {
    const plugin = pluginUiInspect({ enabled: false });
    const { api, modifiers, devServerHandlers } = mockApi();

    plugin.setup(api as never);

    expect(modifiers).toHaveLength(0);
    expect(devServerHandlers).toHaveLength(0);
  });

  it('registers a bottom Rspack-compatible plugin through modifyRspackConfig', () => {
    const plugin = pluginUiInspect();
    const { api, modifiers, devServerHandlers } = mockApi();

    plugin.setup(api as never);

    expect(modifiers).toHaveLength(1);
    expect(devServerHandlers).toHaveLength(1);

    const config = { plugins: [] as unknown[] };
    const result = modifiers[0](config, { env: 'development' });

    expect(result).toBe(config);
    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0]).toMatchObject({
      apply: expect.any(Function),
    });
  });

  it('creates config.plugins when missing', () => {
    const plugin = pluginUiInspect();
    const { api, modifiers } = mockApi();

    plugin.setup(api as never);

    const config: { plugins?: unknown[] } = {};
    modifiers[0](config, { env: 'development' });

    expect(config.plugins).toHaveLength(1);
  });

  it('registers Rsbuild dev server routes for client and Diana resources', async () => {
    const plugin = pluginUiInspect();
    const { api, devServerHandlers } = mockApi();
    const routes: Record<string, unknown> = {};

    plugin.setup(api as never);
    await devServerHandlers[0]({
      server: {
        middlewares: {
          use(path: string, handler: unknown) {
            routes[path] = handler;
          },
        },
      },
    });

    expect(Object.keys(routes).sort()).toEqual([
      '/@ui-inspect/client.js',
      '/@ui-inspect/diana.webp',
    ].sort());
  });

  it('does not register the bottom plugin for production Rspack config', () => {
    const plugin = pluginUiInspect();
    const { api, modifiers } = mockApi();

    plugin.setup(api as never);

    const config = { mode: 'production', plugins: [] as unknown[] };
    const result = modifiers[0](config, { env: 'production' });

    expect(result).toBe(config);
    expect(config.plugins).toHaveLength(0);
  });

  it('prefers user root over normalized config root', () => {
    const plugin = pluginUiInspect({ root: '/custom/root' });
    const { api, modifiers } = mockApi({ source: { root: '/source/root' }, root: '/config/root' });

    plugin.setup(api as never);

    const config = { plugins: [] as unknown[] };
    modifiers[0](config, { env: 'development' });

    expect(config.plugins[0]).toMatchObject({
      options: expect.objectContaining({ root: '/custom/root' }),
    });
  });

  it('uses normalized source root before config root', () => {
    const plugin = pluginUiInspect();
    const { api, modifiers } = mockApi({ source: { root: '/source/root' }, root: '/config/root' });

    plugin.setup(api as never);

    const config = { plugins: [] as unknown[] };
    modifiers[0](config, { env: 'development' });

    expect(config.plugins[0]).toMatchObject({
      options: expect.objectContaining({ root: '/source/root' }),
    });
  });
});
