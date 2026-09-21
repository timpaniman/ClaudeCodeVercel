// 임시: P3 (관리자) 1차 — 페이지 제목, 내비게이션, 알림 결과 문구, 공지 관리 목록/폼, 승인 대기
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
const A = 'src/app/(admin)/admin'

// ---------- 서버 페이지: 제목 ----------
rep(`${A}/announcements/[id]/edit/page.tsx`, [
  ["import { z } from 'zod'", "import { z } from 'zod'\nimport { getTranslations } from 'next-intl/server'"],
  ['export default async function EditAnnouncementPage({ params }: { params: { id: string } }) {\n  if (!z.uuid().safeParse(params.id).success) notFound()\n', "export default async function EditAnnouncementPage({ params }: { params: { id: string } }) {\n  if (!z.uuid().safeParse(params.id).success) notFound()\n\n  const t = await getTranslations('admin.titles')\n"],
  ['공지 수정</h1>', "{t('announcementEdit')}</h1>"],
])
rep(`${A}/announcements/new/page.tsx`, [
  ['공지 작성</h1>', "{t('announcementNew')}</h1>"],
])
rep(`${A}/announcements/page.tsx`, [
  ["import { PenLine } from 'lucide-react'", "import { PenLine } from 'lucide-react'\nimport { getTranslations } from 'next-intl/server'"],
  ["  const { supabase } = await getSessionProfile()\n  const { data } = await supabase\n    .from('announcements')", "  const t = await getTranslations('admin')\n  const { supabase } = await getSessionProfile()\n  const { data } = await supabase\n    .from('announcements')"],
  ['공지 관리</h1>', "{t('titles.announcements')}</h1>"],
  ['<PenLine size={18} aria-hidden /> 공지 작성', "<PenLine size={18} aria-hidden /> {t('writeAnnouncement')}"],
])
rep(`${A}/approvals/page.tsx`, [
  ["import { getSessionProfile }", "import { getTranslations } from 'next-intl/server'\nimport { getSessionProfile }"],
  ["export default async function AdminApprovalsPage() {\n", "export default async function AdminApprovalsPage() {\n  const t = await getTranslations('admin')\n"],
  ['승인 대기</h1>', "{t('titles.approvals')}</h1>"],
  ["        명단에 없는 이메일로 가입한 분들입니다. 기수를 확인하고 승인하면 바로 이용할 수 있습니다.\n        명단에 나중에 등록하면 자동으로 승인되므로 이 화면에서 처리하지 않아도 됩니다.", "        {t('approvalsNote')}"],
])
rep(`${A}/resources/new/page.tsx`, [
  ["import { getSessionProfile }", "import { getTranslations } from 'next-intl/server'\nimport { getSessionProfile }"],
  ["export default async function NewResourcePage() {\n", "export default async function NewResourcePage() {\n  const t = await getTranslations('admin.titles')\n"],
  ['자료 올리기</h1>', "{t('resourceNew')}</h1>"],
])
rep(`${A}/resources/[id]/edit/page.tsx`, [
  ["import { z } from 'zod'", "import { z } from 'zod'\nimport { getTranslations } from 'next-intl/server'"],
  ['export default async function EditResourcePage({ params }: { params: { id: string } }) {\n  if (!z.uuid().safeParse(params.id).success) notFound()\n', "export default async function EditResourcePage({ params }: { params: { id: string } }) {\n  if (!z.uuid().safeParse(params.id).success) notFound()\n\n  const t = await getTranslations('admin.titles')\n"],
  ['자료 수정</h1>', "{t('resourceEdit')}</h1>"],
])
rep(`${A}/resources/page.tsx`, [
  ["import { Upload } from 'lucide-react'", "import { Upload } from 'lucide-react'\nimport { getTranslations } from 'next-intl/server'"],
  ["  const { supabase } = await getSessionProfile()\n  const cohorts = await loadCohorts(supabase)", "  const t = await getTranslations('admin')\n  const { supabase } = await getSessionProfile()\n  const cohorts = await loadCohorts(supabase)"],
  ['자료 관리</h1>', "{t('titles.resources')}</h1>"],
  ['<Upload size={18} aria-hidden /> 자료 올리기', "<Upload size={18} aria-hidden /> {t('uploadResource')}"],
])
rep(`${A}/roster/page.tsx`, [
  ["import { getSessionProfile }", "import { getTranslations } from 'next-intl/server'\nimport { getSessionProfile }"],
  ["export default async function AdminRosterPage() {\n", "export default async function AdminRosterPage() {\n  const t = await getTranslations('admin.titles')\n"],
  ['명단 관리</h1>', "{t('roster')}</h1>"],
])

// ---------- AdminNav ----------
rep('src/features/admin/components/AdminNav.tsx', [
  ["import { usePathname } from 'next/navigation'", "import { usePathname } from 'next/navigation'\nimport { useTranslations } from 'next-intl'"],
  [
    "  { href: '/admin', label: '대시보드', exact: true },\n  { href: '/admin/roster', label: '명단' },\n  { href: '/admin/resources', label: '자료' },\n  { href: '/admin/announcements', label: '공지' },\n  { href: '/admin/approvals', label: '승인 대기', badge: true },",
    "  { href: '/admin', label: 'dashboard', exact: true },\n  { href: '/admin/roster', label: 'roster' },\n  { href: '/admin/resources', label: 'resources' },\n  { href: '/admin/announcements', label: 'announcements' },\n  { href: '/admin/approvals', label: 'approvals', badge: true },",
  ],
  ['export function AdminNav({ pendingCount }: { pendingCount: number }) {\n  const pathname', "export function AdminNav({ pendingCount }: { pendingCount: number }) {\n  const t = useTranslations('admin.nav')\n  const pathname"],
  ['aria-label="관리자 메뉴"', "aria-label={t('label')}"],
  ['              {tab.label}\n', '              {t(tab.label)}\n'],
])

// ---------- publishClient: 결과를 문구가 아니라 키로 ----------
wr(
  'src/features/admin/publishClient.ts',
  `// Design Ref: §4.2 POST /api/admin/publish — 브라우저에서 공개/게시 + 알림을 요청하는 클라이언트와 결과 키.
// 문구는 언어별 문구 파일(admin.notice.*)에 있고, 이 파일은 상태를 키로만 다룬다.
import { apiErrorKey, type ClientApiErrorCode } from '@/lib/api/clientErrors'

export type NotificationStatus = 'not_requested' | 'not_configured' | 'already_queued' | 'sent' | 'partial' | 'none'

export interface NotificationResult {
  status: NotificationStatus
  sent?: number
  failed?: number
}

/** 실패 종류: 'network' = 연결 오류, 그 밖에는 API 오류 코드('generic' 포함). 화면이 현재 언어로 번역한다 */
export type PublishFailure = 'network' | ClientApiErrorCode | 'generic'

export type PublishResult = { ok: true; notification: NotificationResult } | { ok: false; error: PublishFailure }

export async function publishWithNotify(kind: 'resource' | 'announcement', id: string, notify: boolean): Promise<PublishResult> {
  try {
    const res = await fetch('/api/admin/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id, notify }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: apiErrorKey(json) }
    return { ok: true, notification: (json?.notification ?? { status: 'not_requested' }) as NotificationResult }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export type NoticeKey = 'notConfigured' | 'alreadyQueued' | 'none' | 'sent' | 'partialCounts' | 'partialUnknown'

/** 알림 결과 → 문구 키(admin.notice.<key>)와 자리표시자 값. 알림을 요청하지 않았으면 null */
export function noticeOf(n: NotificationResult): { key: NoticeKey; sent: number; failed: number } | null {
  const sent = n.sent ?? 0
  const failed = n.failed ?? 0
  switch (n.status) {
    case 'not_requested':
      return null
    case 'not_configured':
      return { key: 'notConfigured', sent, failed }
    case 'already_queued':
      return { key: 'alreadyQueued', sent, failed }
    case 'none':
      return { key: 'none', sent, failed }
    case 'sent':
      return { key: 'sent', sent, failed }
    case 'partial':
      return { key: failed > 0 || sent > 0 ? 'partialCounts' : 'partialUnknown', sent, failed }
  }
}

const QUERY_STATUSES: NotificationStatus[] = ['not_configured', 'already_queued', 'sent', 'partial', 'none']

/** 목록 화면으로 돌아갈 때 붙이는 결과 쿼리 (?n=sent&s=12&f=0). 문구가 아니라 코드와 숫자만 싣는다 */
export function noticeQuery(n: NotificationResult): string {
  if (n.status === 'not_requested') return ''
  const sp = new URLSearchParams({ n: n.status })
  if (n.sent) sp.set('s', String(n.sent))
  if (n.failed) sp.set('f', String(n.failed))
  return \`?\${sp.toString()}\`
}

/** 목록 화면이 쿼리에서 결과를 복원한다 (허용된 코드와 숫자만 받는다). 없으면 null */
export function noticeFromParams(sp: { n?: string; s?: string; f?: string }): NotificationResult | null {
  if (!QUERY_STATUSES.includes(sp.n as NotificationStatus)) return null
  const num = (v?: string) => (v && /^\\d{1,5}$/.test(v) ? Number(v) : 0)
  return { status: sp.n as NotificationStatus, sent: num(sp.s), failed: num(sp.f) }
}
`,
)
wr(
  'src/features/admin/useNoticeText.ts',
  `'use client'

import { useTranslations } from 'next-intl'
import { noticeOf, type NotificationResult, type PublishFailure } from './publishClient'

/** 알림 결과와 발행 실패를 현재 언어의 문구로 바꾸는 훅 (관리자 목록·폼 공용) */
export function useNoticeText() {
  const t = useTranslations()
  return {
    /** 알림 결과 문구. 알림을 요청하지 않았으면 null */
    notice(n: NotificationResult | null): string | null {
      const d = n ? noticeOf(n) : null
      return d ? t(\`admin.notice.\${d.key}\`, { sent: d.sent, failed: d.failed }) : null
    },
    /** 발행 실패 문구 */
    failure(f: PublishFailure): string {
      return f === 'network' ? t('admin.notice.network') : t(\`apiErrors.\${f}\`)
    },
  }
}
`,
)

// ---------- AnnouncementAdminList ----------
rep('src/features/admin/components/AnnouncementAdminList.tsx', [
  ["import { Pin } from 'lucide-react'", "import { Pin } from 'lucide-react'\nimport { useLocale, useTranslations } from 'next-intl'"],
  ["import { describeNotification, publishWithNotify } from '../publishClient'", "import { publishWithNotify, type NotificationResult } from '../publishClient'\nimport { useNoticeText } from '../useNoticeText'"],
  ['initialNotice = null }: { rows: AdminAnnouncementRow[]; emailEnabled?: boolean; initialNotice?: string | null }) {\n  const router = useRouter()', "initialNotice = null }: { rows: AdminAnnouncementRow[]; emailEnabled?: boolean; initialNotice?: NotificationResult | null }) {\n  const t = useTranslations('admin.announcements')\n  const locale = useLocale()\n  const text = useNoticeText()\n  const router = useRouter()"],
  ['useState<string | null>(initialNotice)', 'useState<string | null>(() => text.notice(initialNotice))'],
  ['        작성한 공지가 없습니다. 위의 공지 작성 버튼으로 첫 공지를 올려 주세요.', "        {t('empty')}"],
  ['aria-label="고정"', "aria-label={t('pinnedAria')}"],
  ["{published ? '게시됨' : '임시저장'}", "{published ? t('published') : t('draft')}"],
  ["{published ? `게시 ${formatDate(r.publishedAt as string)}` : `작성 ${formatDate(r.createdAt)}`}", "{published ? t('publishedOn', { date: formatDate(r.publishedAt as string, locale) }) : t('createdOn', { date: formatDate(r.createdAt, locale) })}"],
  ["'게시를 취소하지 못했습니다.')", "t('errUnpublish'))"],
  ['                    게시 취소\n', "                    {t('unpublish')}\n"],
  ["'게시하지 못했습니다.')", "t('errPublish'))"],
  ['                      게시\n                    </button>', "                      {t('publish')}\n                    </button>"],
  ['                          if (!res.ok) return setError(res.error)\n                          setNotice(describeNotification(res.notification))', '                          if (!res.ok) return setError(text.failure(res.error))\n                          setNotice(text.notice(res.notification))'],
  ['                        게시 + 알림\n', "                        {t('publishNotify')}\n"],
  ["'고정 상태를 바꾸지 못했습니다.')", "t('errPin'))"],
  ["{r.isPinned ? '고정 해제' : '상단 고정'}", "{r.isPinned ? t('unpin') : t('pin')}"],
  ['                  수정\n                </Link>', "                  {t('edit')}\n                </Link>"],
  ['window.confirm(`"${r.title}" 공지를 삭제할까요?\\n삭제하면 되돌릴 수 없습니다.`)', "window.confirm(t('confirmDelete', { title: r.title }))"],
  ["'삭제하지 못했습니다.')", "t('errDelete'))"],
  ['                  삭제\n                </button>', "                  {t('delete')}\n                </button>"],
])

// ---------- AnnouncementForm ----------
rep('src/features/admin/components/AnnouncementForm.tsx', [
  ["import { Loader2 } from 'lucide-react'", "import { Loader2 } from 'lucide-react'\nimport { useTranslations } from 'next-intl'"],
  ["import { noticeQuery, publishWithNotify } from '../publishClient'", "import { noticeQuery, publishWithNotify } from '../publishClient'\nimport { useNoticeText } from '../useNoticeText'"],
  ["emailEnabled?: boolean }) {\n  const router = useRouter()", "emailEnabled?: boolean }) {\n  const t = useTranslations('admin.announcementForm')\n  const te = useTranslations('announcements.errors')\n  const text = useNoticeText()\n  const router = useRouter()"],
  ["    if (problem) return setError(problem)", "    if (problem) return setError(te(problem.key, { max: 'max' in problem ? problem.max : 0 }))"],
  ["         return setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')", "         return setError(t('errSave'))"],
  ["        setError('임시저장은 됐지만 게시하지 못했습니다. 목록에서 \"게시\"를 눌러 주세요.')", "        setError(t('errPublishAfterSave'))"],
  ["      return setError('게시를 취소하지 못했습니다.')", "      return setError(t('errUnpublish'))"],
  ['          제목\n        </label>', "          {t('title')}\n        </label>"],
  ['placeholder="예: 17기 8주차 자료가 올라왔습니다"', "placeholder={t('titlePlaceholder')}"],
  ['            내용 <span className="text-gray-500 font-normal">(마크다운: **굵게**, - 목록, [링크](https://…))</span>', "            {t('body')} <span className=\"text-gray-500 font-normal\">{t('markdownHint')}</span>"],
  ["(['edit', 'preview'] as const).map((t) => (\n              <button\n                key={t}", "(['edit', 'preview'] as const).map((tabKey) => (\n              <button\n                key={tabKey}"],
  ['aria-selected={tab === t}\n                onClick={() => setTab(t)}', 'aria-selected={tab === tabKey}\n                onClick={() => setTab(tabKey)}'],
  ["tab === t ? 'bg-indigo-600 text-white'", "tab === tabKey ? 'bg-indigo-600 text-white'"],
  ["{t === 'edit' ? '작성' : '미리보기'}", "{tabKey === 'edit' ? t('tabEdit') : t('tabPreview')}"],
  ["              {body.length.toLocaleString('ko-KR')} / {MAX_BODY_LENGTH.toLocaleString('ko-KR')}자", "              {t('counter', { count: body.length, max: MAX_BODY_LENGTH })}"],
  ['<p className="text-gray-500">미리볼 내용이 없습니다.</p>', "<p className=\"text-gray-500\">{t('noPreview')}</p>"],
  ['px-1 text-sm font-medium text-gray-300">게시 설정</legend>', "px-1 text-sm font-medium text-gray-300\">{t('settings')}</legend>"],
  ['          상단에 고정\n', "          {t('pin')}\n"],
  ["          게시할 때 이메일 알림 발송\n          {!emailEnabled ? ' (이메일 서비스 설정 전)' : isPublished ? ' (이미 게시된 공지)' : ''}", "          {t('notify')}\n          {!emailEnabled ? t('notifyNoEmail') : isPublished ? t('notifyPublished') : ''}"],
  ["aria-hidden />} 저장\n", "aria-hidden />} {t('save')}\n"],
  ["{busy === 'unpublish' ? '처리 중…' : '게시 취소(임시저장으로)'}", "{busy === 'unpublish' ? t('working') : t('unpublish')}"],
  ["aria-hidden />} 게시\n", "aria-hidden />} {t('publish')}\n"],
  ["aria-hidden />} 임시저장\n", "aria-hidden />} {t('saveDraft')}\n"],
  ["{isEdit ? '취소' : '목록으로'}", "{isEdit ? t('cancel') : t('toList')}"],
])

// ---------- ApprovalList ----------
rep('src/features/admin/components/ApprovalList.tsx', [
  ["import { Loader2 } from 'lucide-react'", "import { Loader2 } from 'lucide-react'\nimport { useLocale, useTranslations } from 'next-intl'"],
  ["export function ApprovalList({ items, cohorts }: { items: ApprovalItem[]; cohorts: Cohort[] }) {\n  const router = useRouter()", "export function ApprovalList({ items, cohorts }: { items: ApprovalItem[]; cohorts: Cohort[] }) {\n  const t = useTranslations('admin.approvals')\n  const tc = useTranslations('common')\n  const locale = useLocale()\n  const router = useRouter()"],
  ["setError('승인하려면 기수를 선택해 주세요.')", "setError(t('errChooseCohort'))"],
  ["setError(err.code === '42501' ? '운영진만 처리할 수 있습니다.' : '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')", "setError(err.code === '42501' ? t('errAdminOnly') : t('errGeneric'))"],
  ["['pending', `대기 ${pendingCount}`],\n            ['rejected', `거절됨 ${rejectedCount}`],", "['pending', t('tabPending', { count: pendingCount })],\n            ['rejected', t('tabRejected', { count: rejectedCount })],"],
  ["          선택한 {selected.size}명 승인", "          {t('approveSelected', { count: selected.size })}"],
  ["{tab === 'pending' ? '승인 대기 중인 분이 없습니다.' : '거절한 분이 없습니다.'}", "{tab === 'pending' ? t('emptyPending') : t('emptyRejected')}"],
  ['aria-label={`${p.name} 선택`}', "aria-label={t('selectAria', { name: p.name })}"],
  ["                    신청 기수 {p.requestedCohort ? `${p.requestedCohort}기` : '미입력'} · {formatRelativeTime(p.createdAt)}", "                    {t('requested', { cohort: p.requestedCohort ? tc('cohort', { number: p.requestedCohort }) : t('notEntered') })} · {formatRelativeTime(p.createdAt, locale)}"],
  ['                  기수 선택\n                </label>', "                  {t('chooseCohort')}\n                </label>"],
  ['<option value="">기수 선택</option>', "<option value=\"\">{t('chooseCohort')}</option>"],
  ['                      {c.number}기\n', "                      {tc('cohort', { number: c.number })}\n"],
  ["<Loader2 size={16} className=\"animate-spin\" /> : '승인'}", "<Loader2 size={16} className=\"animate-spin\" /> : t('approve')}"],
  ['                    거절\n', "                    {t('reject')}\n"],
])
console.log('P3 1차 완료')
