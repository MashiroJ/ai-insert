import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { uiInspect } from '@mashiro39/ui-inspect-vite-plugin';

export default defineConfig({
  plugins: [vue(), uiInspect()],
});
