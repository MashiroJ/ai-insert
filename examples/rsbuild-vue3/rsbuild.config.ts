import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginUiInspect } from '@ui-inspect/rsbuild-plugin';

export default defineConfig({
  server: {
    port: 3202,
  },
  source: {
    entry: {
      index: './src/main.ts',
    },
  },
  html: {
    title: 'AI Inspect Rsbuild Vue Example',
    mountId: 'app',
  },
  plugins: [pluginVue(), pluginUiInspect()],
});
