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
// ---------- AnnouncementForm ----------
rep('src/features/admin/components/AnnouncementForm.tsx', [
  ["import { Loader2 } from 'lucide-react'", "import { Loader2 } from 'lucide-react'\nimport { useTranslations } from 'next-intl'"],
  ["import { noticeQuery, publishWithNotify } from '../publishClient'", "import { noticeQuery, publishWithNotify } from '../publishClient'\nimport { useNoticeText } from '../useNoticeText'"],
  ["emailEnabled?: boolean }) {\n  const router = useRouter()", "emailEnabled?: boolean }) {\n  const t = useTranslations('admin.announcementForm')\n  const te = useTranslations('announcements.errors')\n  const text = useNoticeText()\n  const router = useRouter()"],
  ["    if (problem) return setError(problem)", "    if (problem) return setError(te(problem.key, { max: 'max' in problem ? problem.max : 0 }))"],
  ["return setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')", "return setError(t('errSave'))"],
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
