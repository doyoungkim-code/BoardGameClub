import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // 테스트 파일들이 같은 에뮬레이터 DB를 쓰므로 순서대로 실행
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
