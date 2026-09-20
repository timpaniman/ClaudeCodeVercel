// 검수한 manifest.csv 의 status=ok 행을 Storage 에 올리고 resources 에 **미공개**로 등록한다.
//
//   npm run migrate:import -- --manifest manifest.csv --dir "D:\드라이브백업" --uploader you@example.com          # 미리보기(dry-run)
//   npm run migrate:import -- --manifest manifest.csv --dir "D:\드라이브백업" --uploader you@example.com --apply  # 실제 업로드
//
// 안전장치
//   - --apply 가 없으면 아무것도 쓰지 않는다 (미리보기).
//   - status=ok 행 중 하나라도 오류가 있으면 아무것도 올리지 않고 오류 목록만 보여 준다.
//   - 성공한 행은 즉시 status=done + resource_id 가 manifest 에 기록된다 → 중단·재실행해도 이미 올린 파일은 건너뛴다.
//   - 등록되는 자료는 항상 미공개다. 검수한 뒤 /admin/resources 에서 공개한다 (알림 없음).
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database'
import { MAX_UPLOAD_BYTES, buildStoragePath, inferFileType } from '../../src/features/library/fileType'
import {
  contentTypeFor,
  parseManifest,
  serializeManifest,
  validateManifestRow,
  type ImportItem,
  type ManifestRow,
} from '../../src/features/migration/manifest'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)
// process.exit 는 열려 있는 네트워크 연결이 있으면 Windows 에서 경고 잡음을 내므로, 오류는 던져서 main 이 종료 코드만 설정한다.
class CliError extends Error {}
const fail = (msg: string): never => {
  throw new CliError(msg)
}

function loadEnv() {
  try {
    process.loadEnvFile(resolve('.env.local'))
  } catch {
    // 환경변수가 이미 설정된 경우
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) fail('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요합니다.')
  return { url: url as string, key: key as string }
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (i < tries) await new Promise((r) => setTimeout(r, 1000 * i))
    }
  }
  throw last
}

const atomicWrite = (path: string, content: string) => {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, content)
  renameSync(tmp, path)
}

async function main() {
  const manifestPath = resolve(arg('manifest') ?? 'manifest.csv')
  const dir = arg('dir')
  const uploaderEmail = arg('uploader')?.trim().toLowerCase()
  const apply = flag('apply')
  const limit = arg('limit') ? Number(arg('limit')) : Infinity

  if (!dir || !uploaderEmail || !existsSync(manifestPath)) {
    fail('사용법: npm run migrate:import -- --manifest manifest.csv --dir "<내려받은 폴더>" --uploader <운영진 이메일> [--apply] [--limit N]')
  }
  const root = resolve(dir as string)

  const parsed = parseManifest(readFileSync(manifestPath, 'utf8'))
  if (parsed.error) fail(parsed.error)
  const rows = parsed.rows

  const { url, key } = loadEnv()
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  console.log(`대상 프로젝트: ${new URL(url).host}   ${apply ? '★ 실제 업로드 모드' : '(미리보기 — 아무것도 쓰지 않습니다)'}`)

  // 업로더(운영진)와 기수 목록
  const { data: uploader } = await supabase.from('profiles').select('id, role, status').eq('email', uploaderEmail as string).maybeSingle()
  if (!uploader || uploader.role !== 'admin' || uploader.status !== 'active') fail(`활성 운영진 계정을 찾을 수 없습니다: ${uploaderEmail}`)
  const { data: cohortRows, error: cohortErr } = await supabase.from('cohorts').select('id, number')
  if (cohortErr || !cohortRows) fail(`기수 목록을 읽지 못했습니다: ${cohortErr?.message}`)
  const cohortIdByNumber = new Map((cohortRows ?? []).map((c) => [c.number, c.id]))
  const cohortNumbers = new Set(cohortIdByNumber.keys())

  // 1) 검증 (status=ok 만)
  const todo: { index: number; item: ImportItem }[] = []
  const problems: string[] = []
  rows.forEach((row, index) => {
    if (row.status.trim().toLowerCase() !== 'ok') return
    const v = validateManifestRow(row, { cohortNumbers })
    if (!v.ok) {
      problems.push(...v.errors.map((e) => `  ${index + 2}번째 줄 [${row.path || row.external_url}]: ${e}`))
      return
    }
    if (v.item.kind === 'file') {
      const abs = join(root, ...(v.item.path as string).split('/'))
      if (!existsSync(abs)) return void problems.push(`  ${index + 2}번째 줄: 파일이 없습니다 → ${abs}`)
      const size = statSync(abs).size
      if (size === 0) return void problems.push(`  ${index + 2}번째 줄: 빈 파일입니다 → ${v.item.path}`)
      if (size > MAX_UPLOAD_BYTES) return void problems.push(`  ${index + 2}번째 줄: 50MB 를 넘습니다 → ${v.item.path}`)
    }
    todo.push({ index, item: v.item })
  })

  const count = (s: string) => rows.filter((r) => r.status.trim().toLowerCase() === s).length
  console.log(`\nmanifest ${rows.length}행:  ok ${count('ok')} · done ${count('done')} · review ${count('review')} · skip ${count('skip')}`)

  if (problems.length > 0) {
    fail(`\n❌ 오류가 있어 아무것도 올리지 않았습니다 (${problems.length}건). manifest 를 고친 뒤 다시 실행하세요:\n${problems.slice(0, 50).join('\n')}${problems.length > 50 ? `\n  … 외 ${problems.length - 50}건` : ''}`)
  }
  if (todo.length === 0) {
    console.log('\n올릴 행이 없습니다. (status 가 ok 인 행이 없거나 모두 done 입니다.)')
    return
  }

  const targets = todo.slice(0, limit)
  const byCohort = new Map<string, number>()
  for (const t of targets) byCohort.set(t.item.cohortNumber === null ? '공용' : `${t.item.cohortNumber}기`, (byCohort.get(t.item.cohortNumber === null ? '공용' : `${t.item.cohortNumber}기`) ?? 0) + 1)
  const bytes = targets.reduce((s, t) => s + (t.item.path ? statSync(join(root, ...t.item.path.split('/'))).size : 0), 0)
  console.log(`\n등록 예정 ${targets.length}건 (파일 ${targets.filter((t) => t.item.kind === 'file').length} · 링크 ${targets.filter((t) => t.item.kind === 'link').length}), 용량 ${(bytes / 1024 / 1024).toFixed(1)}MB`)
  console.log('  기수별:', Array.from(byCohort.entries()).sort().map(([k, v]) => `${k}=${v}`).join(', '))
  console.log('  예시:')
  for (const t of targets.slice(0, 5)) console.log(`   - [${t.item.cohortNumber ?? '공용'}] ${t.item.title}  (${t.item.path ?? t.item.externalUrl})`)

  if (!apply) {
    console.log('\n미리보기입니다. 문제가 없으면 같은 명령에 --apply 를 붙여 실제로 올리세요. 등록된 자료는 미공개 상태입니다.')
    return
  }

  // 2) 실제 업로드 (한 건씩, 성공할 때마다 manifest 저장)
  let ok = 0
  const failures: string[] = []
  for (const { index, item } of targets) {
    const row = rows[index] as ManifestRow
    const id = randomUUID()
    let storagePath: string | null = null
    try {
      let fileType: string | null = null
      let fileSize: number | null = null

      if (item.kind === 'file') {
        const abs = join(root, ...(item.path as string).split('/'))
        const buf = readFileSync(abs)
        storagePath = buildStoragePath(item.cohortNumber, id, item.path as string)
        try {
          await withRetry(async () => {
            const r = await supabase.storage.from('resources').upload(storagePath as string, buf, { contentType: contentTypeFor(abs), upsert: false })
            if (r.error) throw new Error(r.error.message)
          })
        } catch (e) {
          throw new Error(`업로드 실패: ${e instanceof Error ? e.message : String(e)}`)
        }
        fileType = inferFileType(item.path as string)
        fileSize = buf.length
      }

      const { error } = await supabase.from('resources').insert({
        id,
        cohort_id: item.cohortNumber === null ? null : (cohortIdByNumber.get(item.cohortNumber) as number),
        uploader_id: uploader!.id,
        title: item.title,
        description: item.description,
        category: item.category,
        week_number: item.week,
        tags: item.tags,
        storage_path: storagePath,
        external_url: item.externalUrl,
        file_type: fileType,
        file_size: fileSize,
        is_published: false,
      })
      if (error) throw new Error(`DB 저장 실패: ${error.message}`)

      row.status = 'done'
      row.resource_id = id
      row.note = ''
      atomicWrite(manifestPath, serializeManifest(rows))
      ok += 1
      if (ok % 10 === 0 || ok === targets.length) console.log(`  진행 ${ok}/${targets.length}`)
    } catch (e) {
      // 행 저장에 실패하면 방금 올린 파일이 고아로 남지 않게 정리한다
      if (storagePath) await supabase.storage.from('resources').remove([storagePath])
      const msg = e instanceof Error ? e.message : String(e)
      row.note = `실패: ${msg}`
      atomicWrite(manifestPath, serializeManifest(rows))
      failures.push(`  ${index + 2}번째 줄 [${item.path ?? item.externalUrl}]: ${msg}`)
    }
  }

  console.log(`\n완료: 성공 ${ok}건, 실패 ${failures.length}건`)
  if (failures.length) {
    fail(`실패한 행은 status=ok 로 남아 있어 다시 실행하면 그 행만 재시도합니다:\n${failures.join('\n')}`)
  }
  console.log('다음 단계: /admin/resources 에서 "미공개" 자료를 검수하고, 전체 선택 → "선택한 N건 공개 (알림 없음)".')
}

main().catch((e) => {
  console.error(e instanceof CliError ? e.message : e)
  process.exitCode = 1
})
