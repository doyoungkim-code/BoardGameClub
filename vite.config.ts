import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // 홈 화면에 설치하는 앱(PWA). 설치 정보(manifest)와 서비스 워커(sw.js)를 만든다
    VitePWA({
      // 새 버전을 배포하면 다음에 열 때 자동으로 바꿔 끼운다 (사용자에게 묻지 않음)
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        // 앱 안에서는 'Do you 보드게임?'
        name: 'Do you 보드게임?',
        // 홈 화면 아이콘 밑 이름만 짧게 (길면 잘려서 오너 요청으로 '보드게임')
        short_name: '보드게임',
        description: 'Do you 보드게임? 동호회 회원 전용 앱',
        lang: 'ko',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#b45309',
        background_color: '#fbf8f1',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 앱 화면(JS·CSS·아이콘·게임 표지)을 기기에 저장해 두고 빠르게 연다
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico}'],
        // 새로고침·주소 직접 입력도 앱 화면으로. 단 Firebase 로그인 경로(/__/)는 서버로 보낸다
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // Firebase SDK(Auth + Firestore) 묶음만 약 620kB(gzip 180kB)라 경고 기준을 그보다 조금 높게
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // 자주 바뀌지 않는 라이브러리를 따로 묶어 배포 후에도 브라우저 캐시를 재사용
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
