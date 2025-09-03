import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Проверяем, нужно ли использовать WASM
const useWasm = process.env.USE_WASM === 'true';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    minify: useWasm ? 'esbuild' : 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});