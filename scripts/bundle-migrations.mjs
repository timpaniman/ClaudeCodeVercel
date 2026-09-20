// supabase/migrations/*.sql 을 이름순으로 합쳐 supabase/bundle/all.sql 로 만든다.
// Supabase 대시보드 SQL Editor에 한 번에 붙여넣기 위한 파일 (CLI 없이 적용).
// 사용: npm run db:bundle
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'supabase', 'migrations')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

if (files.length === 0) {
  console.error('supabase/migrations 에 .sql 파일이 없습니다.')
  process.exit(1)
}

const header = `-- ============================================================
-- AI4CEO 졸업생 포털 — 마이그레이션 번들 (자동 생성, 직접 수정 금지)
-- 생성: npm run db:bundle
-- 포함: ${files.join(', ')}
-- ============================================================\n\n`

const body = files
  .map((f) => `-- >>>>>>>>>> ${f}\n${readFileSync(join(dir, f), 'utf8').trimEnd()}\n`)
  .join('\n')

mkdirSync(join(root, 'supabase', 'bundle'), { recursive: true })
const out = join(root, 'supabase', 'bundle', 'all.sql')
writeFileSync(out, header + body)
console.log(`${files.length}개 파일 → ${out}`)
