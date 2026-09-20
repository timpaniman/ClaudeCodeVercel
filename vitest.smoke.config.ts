import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// L1 — 서버에 HTTP 로 묻는 스모크 테스트 (Design §8.3). 서버가 떠 있어야 한다. SMOKE_URL 로 대상을 바꾼다.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['tests/smoke/**/*.test.ts'], environment: 'node', testTimeout: 30_000 },
})
