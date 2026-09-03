import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate': o service worker troca de versão sozinho em segundo
      // plano assim que há um deploy novo (o utilizador nunca fica preso
      // numa versão antiga só por não ter feito refresh manual).
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kuava POS',
        short_name: 'Kuava POS',
        description: 'Ponto de venda, faturação e stock para pequenas e médias empresas em Moçambique.',
        lang: 'pt-MZ',
        start_url: '/',
        display: 'standalone',
        background_color: '#F4F6F5',
        theme_color: '#0F7A5C',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Só pré-cacheia os ficheiros estáticos da app (JS/CSS/HTML/ícones)
        // gerados pelo build — nunca respostas de /api/*. Isto é
        // deliberado: preços, stock e faturas têm de vir sempre da rede
        // quando ela existe; a app já tem o seu próprio mecanismo de
        // resiliência offline (Dexie/IndexedDB, ver useOfflineStore) para
        // continuar a vender sem ligação — o service worker aqui só
        // garante que a própria aplicação (o "casco") abre mesmo sem rede,
        // não substitui nem intercepta chamadas à API.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
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
