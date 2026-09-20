import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// 단위 테스트 — DB·네트워크 없이 실행되는 순수 로직 (경로 가드, 리다이렉트 안전 검사, 명단 CSV)
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
