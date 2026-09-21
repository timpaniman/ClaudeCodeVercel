// 임시: P3 마무리 — 남은 컴파일 오류 정리
import fs from 'node:fs'
const rd = (p) => fs.readFileSync(p, 'utf8')
const wr = (p, s) => fs.writeFileSync(p, s)
function rep(p, pairs) {
  let s = rd(p)
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error('missing in ' + p + ': ' + a.slice(0, 80))
    s = s.split(a).join(b)
  }
  wr(p, s)
}

rep('src/app/(admin)/admin/announcements/new/page.tsx', [
  ["import { getSessionProfile } from '@/lib/auth/session'", "import { getTranslations } from 'next-intl/server'\nimport { getSessionProfile } from '@/lib/auth/session'"],
  ["export default async function NewAnnouncementPage() {\n  const { user }", "export default async function NewAnnouncementPage() {\n  const t = await getTranslations('admin.titles')\n  const { user }"],
])

rep('src/features/admin/components/ResourceAdminTable.tsx', [
  ["      if (!r.ok) return { message: r.error }\n      setNotice(describeNotification(r.notification))", "      if (!r.ok) return { message: text.failure(r.error) }\n      setNotice(text.notice(r.notification))"],
])

// 드라이브 이전 도구(운영진이 터미널에서 쓰는 CLI)는 한국어 CSV 를 읽고 한국어로 안내한다. 자체 한국어 카테고리 이름을 가진다.
rep('src/features/migration/manifest.ts', [
  ["import { CATEGORIES, CATEGORY_LABEL, MAX_WEEK, type Category } from '../library/params'", "import { CATEGORIES, MAX_WEEK, type Category } from '../library/params'"],
  ["import { parseTags } from '../library/tags'", "import { parseTags, type TagError } from '../library/tags'"],
  [
    "const CATEGORY_BY_LABEL = new Map<string, Category>(CATEGORIES.map((c) => [CATEGORY_LABEL[c], c]))",
    "// CSV 의 category 칸에 한국어 이름(강의자료 등)도 쓸 수 있다\nconst CATEGORY_KO: Record<Category, string> = { lecture: '강의자료', code: '코드', video: '영상', reference: '참고자료', assignment: '과제' }\nconst CATEGORY_BY_LABEL = new Map<string, Category>(CATEGORIES.map((c) => [CATEGORY_KO[c], c]))\n\nconst tagErrorText = (e: TagError) => (e.key === 'tooLong' ? `태그는 ${e.max}자 이내로 입력해 주세요. (\"${e.tag}…\")` : `태그는 최대 ${e.max}개까지 입력할 수 있습니다.`)",
  ],
  ["if (tags.error) errors.push(tags.error)", "if (tags.error) errors.push(tagErrorText(tags.error))"],
])

// 알림 메일 본문의 카테고리 이름: 수신자 언어별 메일은 P4 에서 다룬다. 그때까지 한국어 이름을 이 파일 안에서만 쓴다.
rep('src/features/notifications/store.ts', [
  ["import { CATEGORY_LABEL } from '@/features/library/params'", "import type { Category } from '@/features/library/params'"],
  ["categoryLabel: CATEGORY_LABEL[data.category] }", "categoryLabel: EMAIL_CATEGORY_KO[data.category] }"],
])
{
  let s = rd('src/features/notifications/store.ts')
  // 파일의 첫 export 앞에 임시 이름 표를 둔다
  const idx = s.indexOf('\nexport ')
  s = s.slice(0, idx) + "\n// TODO(i18n P4): 수신자 언어에 맞춘 메일로 바꾸면 이 표는 문구 파일로 이동한다\nconst EMAIL_CATEGORY_KO: Record<Category, string> = { lecture: '강의자료', code: '코드', video: '영상', reference: '참고자료', assignment: '과제' }\n" + s.slice(idx)
  wr('src/features/notifications/store.ts', s)
}
{
  // 기수 번호를 읽을 때 "17기" 처럼 한국어 접미사도 받아 주는 입력 규칙 (화면 문구가 아님)
  let r = rd('src/features/admin/services/roster.ts')
  r = r.replace("const m = raw.trim().match(/^(\\d{1,3})\\s*기?$/)", "const m = raw.trim().match(/^(\\d{1,3})\\s*기?$/) // i18n-ignore: \"17기\" 도 인식")
  wr('src/features/admin/services/roster.ts', r)
  let m = rd('src/features/migration/manifest.ts')
  wr('src/features/migration/manifest.ts', m)
}
console.log('P3 마무리 완료')
