// 드라이브에서 내려받은 폴더를 훑어 검수용 manifest.csv 를 만든다. (서버·DB 접근 없음, 읽기 전용)
//
//   npm run migrate:scan -- --dir "D:\드라이브백업" --out manifest.csv [--force]
//
// 기수·주차·카테고리·제목은 폴더/파일 이름에서 추측한 값이다. 엑셀로 열어 고친 뒤 migrate:import 로 올린다.
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isJunkFile, scanRow, serializeManifest, type ManifestRow } from '../../src/features/migration/manifest'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)

function walk(root: string, rel = ''): { rel: string; size: number }[] {
  const out: { rel: string; size: number }[] = []
  const entries = readdirSync(join(root, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  for (const e of entries) {
    if (isJunkFile(e.name)) continue
    const childRel = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...walk(root, childRel))
    else if (e.isFile()) out.push({ rel: childRel, size: statSync(join(root, childRel)).size })
  }
  return out
}

function main() {
  const dir = arg('dir')
  const out = resolve(arg('out') ?? 'manifest.csv')
  if (!dir || !existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error('사용법: npm run migrate:scan -- --dir "<내려받은 폴더>" --out manifest.csv [--force]')
    process.exitCode = 1
    return
  }
  if (existsSync(out) && !flag('force')) {
    console.error(`이미 있는 파일입니다: ${out}\n수정한 내용이 사라질 수 있어 덮어쓰지 않습니다. 새로 만들려면 --force 를 붙이세요.`)
    process.exitCode = 1
    return
  }

  const files = walk(resolve(dir))
  if (files.length === 0) {
    console.error('이전할 파일이 없습니다.')
    process.exitCode = 1
    return
  }

  // macOS 에서 압축한 한글 이름은 자모가 분리(NFD)되어 있을 수 있다. 추측은 NFC 로, 경로는 디스크에 있는 그대로 저장한다.
  const rows: ManifestRow[] = files.map((f) => ({ ...scanRow(f.rel.normalize('NFC'), f.size), path: f.rel }))
  writeFileSync(out, serializeManifest(rows))

  const count = (s: string) => rows.filter((r) => r.status === s).length
  const cohorts = new Map<string, number>()
  for (const r of rows) cohorts.set(r.cohort_number || '(미확인)', (cohorts.get(r.cohort_number || '(미확인)') ?? 0) + 1)

  console.log(`\n스캔 완료: ${files.length}개 파일 → ${out}`)
  console.log(`  ok ${count('ok')}  |  review ${count('review')} (사람이 확인)  |  skip ${count('skip')} (올리지 않음)`)
  console.log('  기수별:', Array.from(cohorts.entries()).sort().map(([k, v]) => `${k}=${v}`).join(', '))
  const notes = rows.filter((r) => r.status !== 'ok').slice(0, 8)
  if (notes.length) {
    console.log('\n확인이 필요한 항목 (일부):')
    for (const r of notes) console.log(`  [${r.status}] ${r.path}\n         ${r.note}`)
  }
  console.log('\n다음 단계: 엑셀로 manifest 를 열어 status/기수/제목 등을 고친 뒤 npm run migrate:import (기본은 미리보기)')
}

main()
