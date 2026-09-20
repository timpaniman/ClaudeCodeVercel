import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// L1 — 로그인한 사용자로 API 를 호출하는 테스트 (Design §8.3). 개발 서버와 dev Supabase 가 필요하다.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['tests/api/**/*.test.ts'], environment: 'node', testTimeout: 30_000, hookTimeout: 120_000, fileParallelism: false },
})
