'use strict';

function loadUiInspect(options) {
  return import('./index.js').then((mod) => {
    const factory = mod.uiInspect || mod.default;
    if (typeof factory !== 'function') {
      throw new TypeError('@ui-inspect/vite-plugin did not export uiInspect');
    }
    return factory(options);
  });
}

function createProxyPlugin(options) {
  let innerPromise;
  let inner;

  const load = async () => {
    if (inner) return inner;
    if (!innerPromise) innerPromise = loadUiInspect(options);
    inner = await innerPromise;
    return inner;
  };

  return {
    name: 'ui-inspect',
    apply: 'serve',
    enforce: 'post',
    async config(userConfig, env) {
      const plugin = await load();
      return typeof plugin.config === 'function' ? plugin.config(userConfig, env) : undefined;
    },
    async configResolved(config) {
      const plugin = await load();
      return typeof plugin.configResolved === 'function' ? plugin.configResolved(config) : undefined;
    },
    async configureServer(server) {
      const plugin = await load();
      return typeof plugin.configureServer === 'function' ? plugin.configureServer(server) : undefined;
    },
    async transformIndexHtml(...args) {
      const plugin = await load();
      return typeof plugin.transformIndexHtml === 'function' ? plugin.transformIndexHtml(...args) : args[0];
    },
  };
}

module.exports = createProxyPlugin;
module.exports.uiInspect = createProxyPlugin;
module.exports.default = createProxyPlugin;
