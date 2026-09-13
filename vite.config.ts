import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
