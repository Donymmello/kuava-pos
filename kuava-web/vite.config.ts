import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // host: true faz o Vite escutar em 0.0.0.0, necessário para aceder ao
    // dev server a partir de fora do contentor Docker (via mapeamento de porta).
    host: true,
  },
});
