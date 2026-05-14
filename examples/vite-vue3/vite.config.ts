import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';

export default defineConfig({
  plugins: [vue(), aiInspect()],
});
