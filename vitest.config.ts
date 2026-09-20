import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// L0 — RLS/DB 테스트 (Design §8.1). dev Supabase 프로젝트를 대상으로 하며 파일을 순차 실행한다
// (테스트 계정·자료 픽스처를 공유하기 때문).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/rls/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/rls/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 90_000,
  },
})
