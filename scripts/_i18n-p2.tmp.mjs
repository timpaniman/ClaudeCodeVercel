// 임시: P2(공지·멤버·내 정보·수신 해제) 파일의 문구를 번역 키로 바꾼다 (정확히 일치하는 문자열만 교체하고, 없으면 중단한다)
import fs from 'node:fs'
const rd = (p) => fs.readFileSync(p, 'utf8')
const wr = (p, s) => fs.writeFileSync(p, s)
function rep(p, pairs) {
  let s = rd(p)
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error('missing in ' + p + ': ' + a.slice(0, 70))
    s = s.split(a).join(b)
  }
  wr(p, s)
}

// ---------- announcements ----------
rep('src/app/(main)/announcements/page.tsx', [
  ["import { PenLine } from 'lucide-react'", "import { PenLine } from 'lucide-react'\nimport { getTranslations } from 'next-intl/server'"],
  ["export const metadata = { title: '공지 — AI4CEO' }\n", "export async function generateMetadata() {\n  const t = await getTranslations('announcements')\n  return { title: t('metaTitle') }\n}\n"],
  ['export default async function AnnouncementsPage({ searchParams }: { searchParams: { page?: string } }) {\n', "export default async function AnnouncementsPage({ searchParams }: { searchParams: { page?: string } }) {\n  const t = await getTranslations('announcements')\n"],
  ['<h1 className="text-2xl font-bold text-white">공지</h1>', "<h1 className=\"text-2xl font-bold text-white\">{t('title')}</h1>"],
  ['<PenLine size={18} aria-hidden /> 공지 작성', "<PenLine size={18} aria-hidden /> {t('write')}"],
  ['<p>공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>', "<p>{t('loadError')}</p>"],
  ['            다시 시도\n', "            {t('retry')}\n"],
  ['          아직 공지가 없습니다.\n', "          {t('empty')}\n"],
  ['              더 보기 (남은 {remaining}건)', "              {t('more', { remaining })}"],
])
rep('src/app/(main)/announcements/[id]/page.tsx', [
  ["import { getSessionProfile }", "import { getLocale, getTranslations } from 'next-intl/server'\nimport { getSessionProfile }"],
  ['<ArrowLeft size={18} aria-hidden /> 공지 목록', "<ArrowLeft size={18} aria-hidden /> {t('back')}"],
  ['          아직 게시되지 않은 공지입니다. 운영진에게만 보입니다.', "          {t('unpublished')}"],
  ['aria-label="고정 공지"', "aria-label={t('pinned')}"],
  ['{formatDate(a.published_at as string)}', '{formatDate(a.published_at as string, locale)}'],
  ['<Pencil size={16} aria-hidden /> 수정', "<Pencil size={16} aria-hidden /> {t('edit')}"],
])
rep('src/app/(main)/announcements/[id]/not-found.tsx', [
  ["import { Bell } from 'lucide-react'", "import { Bell } from 'lucide-react'\nimport { getTranslations } from 'next-intl/server'"],
  ['export default function AnnouncementNotFound() {\n  return (', "export default async function AnnouncementNotFound() {\n  const t = await getTranslations('announcements.notFound')\n  return ("],
  ['공지를 찾을 수 없습니다</h1>', "{t('title')}</h1>"],
  ['>삭제되었거나 아직 게시되지 않은 공지입니다.</p>', ">{t('body')}</p>"],
  ['        공지 목록으로\n', "        {t('back')}\n"],
])
rep('src/features/announcements/components/AnnouncementItem.tsx', [
  ["import { Pin } from 'lucide-react'", "import { Pin } from 'lucide-react'\nimport { useLocale, useTranslations } from 'next-intl'"],
  ['export function AnnouncementItem({ item }: { item: AnnouncementListItem }) {\n  return (', "export function AnnouncementItem({ item }: { item: AnnouncementListItem }) {\n  const t = useTranslations('announcements')\n  const locale = useLocale()\n  return ("],
  ['aria-label="안 읽음"', "aria-label={t('unread')}"],
  ['aria-label="고정 공지"', "aria-label={t('pinned')}"],
  ['{formatDate(item.publishedAt)}', '{formatDate(item.publishedAt, locale)}'],
])
{
  let q = rd('src/features/announcements/queries.ts')
  q = q.split('announcements 조회 실패').join('announcements query failed').split('announcement_reads 조회 실패').join('announcement_reads query failed')
  wr('src/features/announcements/queries.ts', q)
}
rep('src/features/announcements/text.ts', [
  [
    "/** 작성 폼 검증. 문제가 없으면 null */\nexport function validateAnnouncement(input: { title: string; body: string }): string | null {\n  const title = input.title.trim()\n  if (!title) return '제목을 입력해 주세요.'\n  if (title.length > MAX_TITLE_LENGTH) return `제목은 ${MAX_TITLE_LENGTH}자 이내로 입력해 주세요.`\n  if (!input.body.trim()) return '내용을 입력해 주세요.'\n  if (input.body.length > MAX_BODY_LENGTH) return `내용은 ${MAX_BODY_LENGTH.toLocaleString('ko-KR')}자 이내로 입력해 주세요.`\n  return null\n}",
    "/** 작성 폼 검증 오류: key 는 announcements.errors.* 문구이고 max 는 문구의 자리표시자 값이다 */\nexport type AnnouncementError = { key: 'titleRequired' | 'bodyRequired' } | { key: 'titleTooLong' | 'bodyTooLong'; max: number }\n\n/** 작성 폼 검증. 문제가 없으면 null */\nexport function validateAnnouncement(input: { title: string; body: string }): AnnouncementError | null {\n  const title = input.title.trim()\n  if (!title) return { key: 'titleRequired' }\n  if (title.length > MAX_TITLE_LENGTH) return { key: 'titleTooLong', max: MAX_TITLE_LENGTH }\n  if (!input.body.trim()) return { key: 'bodyRequired' }\n  if (input.body.length > MAX_BODY_LENGTH) return { key: 'bodyTooLong', max: MAX_BODY_LENGTH }\n  return null\n}",
  ],
])

// ---------- directory ----------
rep('src/app/(main)/directory/page.tsx', [
  ["import { Search } from 'lucide-react'", "import { Search } from 'lucide-react'\nimport { getTranslations } from 'next-intl/server'"],
  ["export const metadata = { title: '멤버 — AI4CEO' }\n", "export async function generateMetadata() {\n  const t = await getTranslations('directory')\n  return { title: t('metaTitle') }\n}\n"],
  ["export default async function DirectoryPage({ searchParams }: { searchParams: { q?: string } }) {\n", "export default async function DirectoryPage({ searchParams }: { searchParams: { q?: string } }) {\n  const t = await getTranslations('directory')\n"],
  ['<h1 className="text-2xl font-bold text-white">멤버</h1>', "<h1 className=\"text-2xl font-bold text-white\">{t('title')}</h1>"],
  ['aria-label="멤버 검색"\n          placeholder="이름·회사·직책 검색"', "aria-label={t('searchLabel')}\n          placeholder={t('placeholder')}"],
  ['          멤버 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', "          {t('loadError')}"],
  ["            “{q}” 검색 결과 {results.length}명\n            {results.length > MAX_SEARCH_RESULTS && ` (상위 ${MAX_SEARCH_RESULTS}명만 표시)`}", "            {t('resultsFor', { q, count: results.length })}\n            {results.length > MAX_SEARCH_RESULTS && t('topOnly', { max: MAX_SEARCH_RESULTS })}"],
  ['              검색 결과가 없습니다.\n', "              {t('noResults')}\n"],
  ['            기수별로 보기\n', "            {t('browseByCohort')}\n"],
  ['className="sr-only">기수별 멤버</h2>', "className=\"sr-only\">{t('cohortGrid')}</h2>"],
  ['              아직 표시할 멤버가 없습니다.\n', "              {t('empty')}\n"],
  ['<span className="text-base text-gray-300">{n}명</span>', "<span className=\"text-base text-gray-300\">{t('count', { count: n })}</span>"],
])
rep('src/app/(main)/directory/[cohortNumber]/page.tsx', [
  ["import { ArrowLeft, Search } from 'lucide-react'", "import { ArrowLeft, Search } from 'lucide-react'\nimport { getTranslations } from 'next-intl/server'"],
  ["  if (!/^\\d{1,3}$/.test(params.cohortNumber)) notFound()\n", "  if (!/^\\d{1,3}$/.test(params.cohortNumber)) notFound()\n  const t = await getTranslations('directory')\n  const tc = await getTranslations('common')\n"],
  ['<ArrowLeft size={18} aria-hidden /> 멤버', "<ArrowLeft size={18} aria-hidden /> {t('back')}"],
  ['{cohort.number}기 <span className="text-base font-normal text-gray-400">{members.length}명</span>', "{tc('cohort', { number: cohort.number })} <span className=\"text-base font-normal text-gray-400\">{t('count', { count: members.length })}</span>"],
  ['aria-label="이 기수에서 검색"\n          placeholder="이름·회사·직책 검색"', "aria-label={t('cohortSearchLabel')}\n          placeholder={t('placeholder')}"],
  ['          멤버 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', "          {t('loadError')}"],
  ["{q ? '검색 결과가 없습니다.' : '아직 표시할 멤버가 없습니다.'}", "{q ? t('noResults') : t('empty')}"],
])
rep('src/features/directory/components/MemberCard.tsx', [
  ["import { Avatar } from '@/components/ui/Avatar'", "import { useTranslations } from 'next-intl'\nimport { Avatar } from '@/components/ui/Avatar'"],
  ['export function MemberCard({ member, cohortNumber }: { member: Member; cohortNumber?: number | null }) {\n', "export function MemberCard({ member, cohortNumber }: { member: Member; cohortNumber?: number | null }) {\n  const t = useTranslations('directory')\n"],
  ["label: '웹사이트' }", "label: t('website') }"],
  ['aria-label={`${member.name} 링크`}', "aria-label={t('linksLabel', { name: member.name })}"],
])
{
  let q = rd('src/features/directory/queries.ts')
  q = q.split('directory_members 실패').join('directory_members failed')
  wr('src/features/directory/queries.ts', q)
}

// ---------- unsubscribe ----------
rep('src/features/notifications/unsubscribe.ts', [
  ["export const SCOPE_LABEL: Record<UnsubscribeScope, string> = {\n  resource: '새 자료 알림',\n  announcement: '공지 알림',\n  all: '모든 알림',\n}\n", ''],
])
rep('src/app/unsubscribe/page.tsx', [
  ["import { CheckCircle2, MailX } from 'lucide-react'", "import { CheckCircle2, MailX } from 'lucide-react'\nimport { getTranslations } from 'next-intl/server'"],
  ["import { SCOPE_LABEL, UNSUBSCRIBE_SCOPES,", "import { UNSUBSCRIBE_SCOPES,"],
  ["export const metadata = { title: '알림 수신 해제 — AI4CEO' }\n", "export async function generateMetadata() {\n  const t = await getTranslations('unsubscribe')\n  return { title: t('metaTitle') }\n}\n"],
  ["export default function UnsubscribePage({ searchParams }: { searchParams: { t?: string; done?: string; s?: string } }) {\n", "export default async function UnsubscribePage({ searchParams }: { searchParams: { t?: string; done?: string; s?: string } }) {\n  const t = await getTranslations('unsubscribe')\n  const b = (chunks: React.ReactNode) => <b className=\"text-gray-200\">{chunks}</b>\n"],
  ['수신을 해제했습니다</h1>', "{t('doneTitle')}</h1>"],
  ["          이제 <b className=\"text-gray-200\">{SCOPE_LABEL[scope]}</b> 메일을 보내지 않습니다. 새 자료와 공지는 포털에서 직접 확인하실 수 있고,\n          알림은 포털의 <b className=\"text-gray-200\">내 프로필</b>에서 언제든 다시 켤 수 있습니다.", "          {t.rich('doneBody', { scope: t(`scopes.${scope}`), b })}"],
  ['          알림 설정 열기\n', "          {t('openSettings')}\n"],
  ['링크를 확인할 수 없습니다</h1>', "{t('invalidTitle')}</h1>"],
  ["          링크가 올바르지 않거나 손상되었습니다. 포털에 로그인해서 <b className=\"text-gray-200\">내 프로필 → 이메일 알림</b>에서 직접 설정을 바꿀 수 있습니다.", "          {t.rich('invalidBody', { b })}"],
  ['          내 프로필로 이동\n', "          {t('toProfile')}\n"],
  ['알림 수신을 해제할까요?</h1>', "{t('confirmTitle')}</h1>"],
  ["        <b className=\"text-gray-200\">{SCOPE_LABEL[payload.s]}</b> 이메일을 더 이상 보내지 않습니다.", "        {t.rich('confirmBody', { scope: t(`scopes.${payload.s}`), b })}"],
  ['          수신 해제\n', "          {t('confirm')}\n"],
  ['          취소\n', "          {t('cancel')}\n"],
])
{
  // 메일 앱·보안 프로그램이 받는 기계용 응답은 영어로 둔다 (사람이 보는 화면은 위 페이지)
  let r = rd('src/app/api/unsubscribe/route.ts')
  r = r.split("'수신 해제를 처리할 수 없습니다.'").join("'Unsubscribe is temporarily unavailable.'")
  r = r.split("'링크가 올바르지 않습니다.'").join("'This link is not valid.'")
  r = r.split("'일시적인 오류입니다. 잠시 후 다시 시도해 주세요.'").join("'Something went wrong. Please try again later.'")
  wr('src/app/api/unsubscribe/route.ts', r)
}
console.log('P2 (announcements, directory, unsubscribe) 변환 완료')
