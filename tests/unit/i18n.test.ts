// Plan: docs/01-plan/features/portal-i18n-en.plan.md §4 — 문구 누락·불일치를 막는 검사.
//  1) 영어·한국어 문구 파일의 키와 자리표시자가 같다
//  2) 영어 문구에 한글이 없다 (언어 이름 "한국어" 제외)
//  3) 아직 영어로 바꾸지 않은 파일 목록(PENDING)이 실제와 정확히 일치한다 — 파일을 변환하면 목록에서 지워야 하고, 새 파일에 한글을 넣으면 실패한다
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'
import { messages } from '@/messages'

type Tree = { [k: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out[key] = v
    else Object.assign(out, flatten(v, key))
  }
  return out
}

const HANGUL = /[가-힣]/
const enFlat = flatten(messages.en as unknown as Tree)
const koFlat = flatten(messages.ko as unknown as Tree)

describe('문구 파일 (en / ko)', () => {
  test('두 파일의 키가 같다', () => {
    const e = Object.keys(enFlat).sort()
    const k = Object.keys(koFlat).sort()
    expect(e.filter((x) => !k.includes(x)), 'ko 에 없는 키').toEqual([])
    expect(k.filter((x) => !e.includes(x)), 'en 에 없는 키').toEqual([])
  })

  test('자리표시자({name})와 서식 태그(<tag>)가 두 언어에서 같다', () => {
    // ICU 인자 이름만 뽑는다: {name} 과 {count, plural, …} 모두 "name"/"count" 로 본다 (복수형 안쪽의 {# item} 은 제외)
    const tokens = (s: string) => Array.from(new Set(Array.from(s.matchAll(/\{(\w+)\s*[,}]|<(\w+)>/g)).map((m) => m[1] ?? `<${m[2]}>`))).sort()
    for (const key of Object.keys(enFlat)) {
      expect(tokens(koFlat[key] ?? ''), key).toEqual(tokens(enFlat[key]))
    }
  })

  test('비어 있는 문구가 없다', () => {
    for (const [k, v] of [...Object.entries(enFlat), ...Object.entries(koFlat)]) expect(v.trim(), k).not.toBe('')
  })

  test('영어 문구에는 한글이 없다 (언어 이름 제외)', () => {
    for (const [k, v] of Object.entries(enFlat)) {
      if (k === 'locale.ko') continue
      expect(HANGUL.test(v), `${k}: ${v}`).toBe(false)
    }
  })
})

// ---- 한글이 남은 소스 파일 검사 ----
const SRC = join(process.cwd(), 'src')
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

/** 주석을 뺀 뒤에도 한글이 남는 줄이 있으면 화면·메시지에 쓰일 수 있는 한국어 문구로 본다 */
function hasUserFacingHangul(source: string): boolean {
  return source.split('\n').some((raw) => {
    let line = raw
    // 'i18n-ignore' 표시가 있는 줄은 화면 문구가 아니라 코드(예: 한국어 입력 해석)로 본다
    if (line.includes('i18n-ignore') || /^\s*(\/\/|\*|\/\*)/.test(line)) return false
    line = line.replace(/\/\*.*?\*\//g, '').replace(/\s\/\/.*$/, '') // 인라인 주석 (https:// 는 앞이 공백이 아니라 보존)
    return HANGUL.test(line)
  })
}

// 아직 영어로 변환하지 않은 파일. 영어화가 끝나 비어 있다 — 새 파일에 한국어 화면 문구를 넣으면 이 검사가 실패하니 src/messages 로 옮긴다.
const PENDING: string[] = []

// 예외 폴더: 운영진이 터미널에서 쓰는 드라이브 이전 도구는 한국어 CSV 를 읽고 한국어로 안내한다 (포털 화면이 아니다)
const IGNORED_DIRS = ['src/features/migration/']

describe('영어화 진행 (한글이 남은 소스 파일)', () => {
  const actual = walk(SRC)
    .map((f) => relative(process.cwd(), f).split('\\').join('/'))
    .filter((f) => !IGNORED_DIRS.some((d) => f.startsWith(d)))
    .filter((f) => hasUserFacingHangul(readFileSync(join(process.cwd(), f), 'utf8')))
    .sort()

  test('한글이 남은 파일 목록이 PENDING 과 정확히 같다', () => {
    const pending = [...PENDING].sort()
    expect(actual.filter((f) => !pending.includes(f)), '새로 한글이 들어간 파일 — 문구 파일로 옮기세요').toEqual([])
    expect(pending.filter((f) => !actual.includes(f)), '변환이 끝난 파일 — PENDING 에서 지우세요').toEqual([])
  })
})
