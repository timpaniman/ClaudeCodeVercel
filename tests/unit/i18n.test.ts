// Plan: docs/01-plan/features/portal-i18n-en.plan.md §4 — 문구 누락·불일치를 막는 검사.
//  1) 영어·한국어 문구 파일의 키와 자리표시자가 같다
//  2) 영어 문구에 한글이 없다 (언어 이름 "한국어" 제외)
//  3) 아직 영어로 바꾸지 않은 파일 목록(PENDING)이 실제와 정확히 일치한다 — 파일을 변환하면 목록에서 지워야 하고, 새 파일에 한글을 넣으면 실패한다
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'
import en from '@/messages/en.json'
import ko from '@/messages/ko.json'

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
const enFlat = flatten(en as Tree)
const koFlat = flatten(ko as Tree)

describe('문구 파일 (en / ko)', () => {
  test('두 파일의 키가 같다', () => {
    const e = Object.keys(enFlat).sort()
    const k = Object.keys(koFlat).sort()
    expect(e.filter((x) => !k.includes(x)), 'ko 에 없는 키').toEqual([])
    expect(k.filter((x) => !e.includes(x)), 'en 에 없는 키').toEqual([])
  })

  test('자리표시자({name})와 서식 태그(<tag>)가 두 언어에서 같다', () => {
    const tokens = (s: string) => Array.from(s.matchAll(/\{(\w+)\}|<(\w+)>/g)).map((m) => m[1] ?? `<${m[2]}>`).sort()
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

// 아직 영어로 변환하지 않은 파일 (P1~P4 진행에 따라 이 목록이 줄어든다. 끝나면 빈 배열)
const PENDING: string[] = [
  'src/app/(admin)/admin/announcements/[id]/edit/page.tsx',
  'src/app/(admin)/admin/announcements/new/page.tsx',
  'src/app/(admin)/admin/announcements/page.tsx',
  'src/app/(admin)/admin/approvals/page.tsx',
  'src/app/(admin)/admin/page.tsx',
  'src/app/(admin)/admin/resources/[id]/edit/page.tsx',
  'src/app/(admin)/admin/resources/new/page.tsx',
  'src/app/(admin)/admin/resources/page.tsx',
  'src/app/(admin)/admin/roster/page.tsx',
  'src/app/(main)/announcements/[id]/not-found.tsx',
  'src/app/(main)/announcements/[id]/page.tsx',
  'src/app/(main)/announcements/page.tsx',
  'src/app/(main)/directory/[cohortNumber]/page.tsx',
  'src/app/(main)/directory/page.tsx',
  'src/app/(main)/home/loading.tsx',
  'src/app/(main)/home/page.tsx',
  'src/app/(main)/library/[id]/not-found.tsx',
  'src/app/(main)/library/[id]/page.tsx',
  'src/app/(main)/library/loading.tsx',
  'src/app/(main)/library/page.tsx',
  'src/app/(main)/me/page.tsx',
  'src/app/api/admin/publish/route.ts',
  'src/app/api/admin/roster/commit/route.ts',
  'src/app/api/admin/roster/preview/route.ts',
  'src/app/api/cron/notify/route.ts',
  'src/app/api/resources/[id]/download/route.ts',
  'src/app/api/unsubscribe/route.ts',
  'src/app/unsubscribe/page.tsx',
  'src/features/admin/components/AdminNav.tsx',
  'src/features/admin/components/AnnouncementAdminList.tsx',
  'src/features/admin/components/AnnouncementForm.tsx',
  'src/features/admin/components/ApprovalList.tsx',
  'src/features/admin/components/ResourceAdminTable.tsx',
  'src/features/admin/components/ResourceForm.tsx',
  'src/features/admin/components/RosterManager.tsx',
  'src/features/admin/components/StatsCharts.tsx',
  'src/features/admin/publishClient.ts',
  'src/features/admin/services/roster.ts',
  'src/features/admin/services/rosterContext.ts',
  'src/features/announcements/components/AnnouncementItem.tsx',
  'src/features/announcements/queries.ts',
  'src/features/announcements/text.ts',
  'src/features/directory/components/MemberCard.tsx',
  'src/features/directory/queries.ts',
  'src/features/library/components/CopyButton.tsx',
  'src/features/library/components/DownloadButton.tsx',
  'src/features/library/components/FileTypeIcon.tsx',
  'src/features/library/components/LibraryFilters.tsx',
  'src/features/library/components/ResourceItem.tsx',
  'src/features/library/components/SignedPreview.tsx',
  'src/features/library/fileType.ts',
  'src/features/library/params.ts',
  'src/features/library/queries.ts',
  'src/features/library/tags.ts',
  'src/features/me/components/InstallHint.tsx',
  'src/features/me/components/NotificationSettings.tsx',
  'src/features/me/components/ProfileForm.tsx',
  'src/features/me/profile.ts',
  'src/features/migration/manifest.ts',
  'src/features/notifications/process.ts',
  'src/features/notifications/provider.ts',
  'src/features/notifications/store.ts',
  'src/features/notifications/templates.ts',
  'src/features/notifications/unsubscribe.ts',
  'src/lib/auth/session.ts',
  'src/lib/supabase/admin.ts',
  'src/lib/utils.ts',
  'src/middleware.ts',
]

describe('영어화 진행 (한글이 남은 소스 파일)', () => {
  const actual = walk(SRC)
    .filter((f) => hasUserFacingHangul(readFileSync(f, 'utf8')))
    .map((f) => relative(process.cwd(), f).split('\\').join('/'))
    .sort()

  test('한글이 남은 파일 목록이 PENDING 과 정확히 같다', () => {
    const pending = [...PENDING].sort()
    expect(actual.filter((f) => !pending.includes(f)), '새로 한글이 들어간 파일 — 문구 파일로 옮기세요').toEqual([])
    expect(pending.filter((f) => !actual.includes(f)), '변환이 끝난 파일 — PENDING 에서 지우세요').toEqual([])
  })
})
