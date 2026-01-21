import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '204府城大師',
        short_name: '204府城大師',
        description: '府城居服員差勤與管理系統',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'app_logo_WH_192x192px.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'app_logo_WH_512x512px.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      }
    }
  }
})
