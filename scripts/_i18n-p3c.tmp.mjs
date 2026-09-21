// 임시: P3 (관리자) 3차 — 명단 관리 화면, 통계 차트, 대시보드, API 오류 메시지, 마이그레이션 도구
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

// ---------- RosterManager ----------
rep('src/features/admin/components/RosterManager.tsx', [
  ["import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2 } from 'lucide-react'", "import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2 } from 'lucide-react'\nimport { useTranslations } from 'next-intl'"],
  ["import type { RosterSummary, ValidatedRosterRow } from '../services/roster'", "import { apiErrorKey } from '@/lib/api/clientErrors'\nimport type { RosterFileError, RosterReason, RosterSummary, ValidatedRosterRow } from '../services/roster'"],
  [
    "const STATUS_LABEL: Record<ValidatedRosterRow['status'], { text: string; className: string }> = {\n  ok: { text: '신규', className: 'bg-emerald-500/15 text-emerald-300' },\n  already_in_roster: { text: '기존', className: 'bg-amber-500/15 text-amber-300' },\n  duplicate_in_file: { text: '중복', className: 'bg-gray-500/20 text-gray-300' },\n  invalid: { text: '오류', className: 'bg-red-500/15 text-red-300' },\n}",
    "// 상태 이름은 문구 파일(admin.roster.status.<status>)에 있다\nconst STATUS_CLASS: Record<ValidatedRosterRow['status'], string> = {\n  ok: 'bg-emerald-500/15 text-emerald-300',\n  already_in_roster: 'bg-amber-500/15 text-amber-300',\n  duplicate_in_file: 'bg-gray-500/20 text-gray-300',\n  invalid: 'bg-red-500/15 text-red-300',\n}\n\n/** 서버 오류 응답 → 오류 종류. 파일 오류(details.reason)가 있으면 그 키를, 없으면 API 오류 코드를 쓴다 */\ntype ReadError = { kind: 'file'; reason: RosterFileError } | { kind: 'api'; key: ReturnType<typeof apiErrorKey> }\n\nasync function readError(res: Response): Promise<ReadError> {\n  try {\n    const j = await res.json()\n    const reason = j?.error?.details?.reason\n    if (reason && typeof reason.key === 'string') return { kind: 'file', reason: reason as RosterFileError }\n    return { kind: 'api', key: apiErrorKey(j) }\n  } catch {\n    return { kind: 'api', key: 'generic' }\n  }\n}",
  ],
  [
    "async function readError(res: Response): Promise<string> {\n  try {\n    const j = await res.json()\n    return j?.error?.message ?? '일시적인 오류입니다. 잠시 후 다시 시도해 주세요.'\n  } catch {\n    return '일시적인 오류입니다. 잠시 후 다시 시도해 주세요.'\n  }\n}\n\n",
    '',
  ],
  ["export function RosterManager({ entries }: { entries: RosterEntry[] }) {\n  const router = useRouter()", "export function RosterManager({ entries }: { entries: RosterEntry[] }) {\n  const t = useTranslations('admin.roster')\n  const ta = useTranslations()\n  const tc = useTranslations('common')\n  const router = useRouter()"],
  [
    "  const importable = useMemo(",
    "  // 오류는 종류로 화면에 그린다 (문구는 현재 언어로)\n  const errorText = (e: ReadError) => (e.kind === 'file' ? t(`fileErrors.${e.reason.key}`, { columns: 'columns' in e.reason ? e.reason.columns : '', max: 'max' in e.reason ? e.reason.max : 0, count: 'count' in e.reason ? e.reason.count : 0 }) : ta(`apiErrors.${e.key}`))\n  const reasonText = (r: RosterReason) => t(`reasons.${r.key}`, { value: 'value' in r ? r.value : '', cohort: 'cohort' in r ? r.cohort : 0 })\n\n  const importable = useMemo(",
  ],
  ["      if (!res.ok) return setError(await readError(res))\n      setPreview(await res.json())", "      if (!res.ok) return setError(errorText(await readError(res)))\n      setPreview(await res.json())"],
  ["      if (!res.ok) return setError(await readError(res))\n      const json = await res.json()", "      if (!res.ok) return setError(errorText(await readError(res)))\n      const json = await res.json()"],
  ["setError('네트워크 오류입니다. 연결을 확인하고 다시 시도해 주세요.')", "setError(t('networkError'))"],
  ["`${e.cohortNumber}기`.includes(q))", "`${e.cohortNumber}기`.includes(q) || `cohort ${e.cohortNumber}`.includes(q)) // i18n-ignore: \"17기\" 로 검색해도 찾는다"],
  ['<h2 className="text-lg font-semibold text-white">명단 CSV 등록</h2>', "<h2 className=\"text-lg font-semibold text-white\">{t('csvTitle')}</h2>"],
  ['<Download size={16} /> 양식 내려받기', "<Download size={16} /> {t('template')}"],
  ['<p className="text-base text-gray-200">CSV 파일을 여기로 끌어오거나</p>', "<p className=\"text-base text-gray-200\">{t('dropText')}</p>"],
  ['            파일 선택\n', "            {t('chooseFile')}\n"],
  ['<p className="text-sm text-gray-500 mt-3">열: email(이메일), name(이름), cohort_number(기수), role(선택: member/admin)</p>', "<p className=\"text-sm text-gray-500 mt-3\">{t('columns')}</p>"],
  ['<Loader2 className="animate-spin" size={18} /> 처리 중…', "<Loader2 className=\"animate-spin\" size={18} /> {t('processing')}"],
  [
    "              등록을 마쳤습니다. 신규 {result.inserted}명 · 갱신 {result.updated}명 · 이미 가입 {result.skipped}명(수정 안 함)\n              {result.activated > 0 && ` · 승인 대기 중이던 ${result.activated}명 자동 승인`}",
    "              {t('committed', { inserted: result.inserted, updated: result.updated, skipped: result.skipped })}\n              {result.activated > 0 && t('committedActivated', { activated: result.activated })}",
  ],
  ['<h2 className="text-lg font-semibold text-white">미리보기</h2>', "<h2 className=\"text-lg font-semibold text-white\">{t('previewTitle')}</h2>"],
  [
    "              ['전체', preview.summary.total, 'bg-white/10 text-gray-200'],\n              ['신규', preview.summary.ok, STATUS_LABEL.ok.className],\n              ['기존', preview.summary.alreadyInRoster, STATUS_LABEL.already_in_roster.className],\n              ['중복', preview.summary.duplicateInFile, STATUS_LABEL.duplicate_in_file.className],\n              ['오류', preview.summary.invalid, STATUS_LABEL.invalid.className],",
    "              [t('summary.total'), preview.summary.total, 'bg-white/10 text-gray-200'],\n              [t('summary.ok'), preview.summary.ok, STATUS_CLASS.ok],\n              [t('summary.existing'), preview.summary.alreadyInRoster, STATUS_CLASS.already_in_roster],\n              [t('summary.duplicate'), preview.summary.duplicateInFile, STATUS_CLASS.duplicate_in_file],\n              [t('summary.invalid'), preview.summary.invalid, STATUS_CLASS.invalid],",
  ],
  ['<th className="px-3 py-2 font-medium">줄</th>\n                  <th className="px-3 py-2 font-medium">상태</th>\n                  <th className="px-3 py-2 font-medium">이메일</th>\n                  <th className="px-3 py-2 font-medium">이름</th>\n                  <th className="px-3 py-2 font-medium">기수</th>\n                  <th className="px-3 py-2 font-medium">역할</th>\n                  <th className="px-3 py-2 font-medium">비고</th>', "<th className=\"px-3 py-2 font-medium\">{t('columnsHeader.line')}</th>\n                  <th className=\"px-3 py-2 font-medium\">{t('columnsHeader.status')}</th>\n                  <th className=\"px-3 py-2 font-medium\">{t('columnsHeader.email')}</th>\n                  <th className=\"px-3 py-2 font-medium\">{t('columnsHeader.name')}</th>\n                  <th className=\"px-3 py-2 font-medium\">{t('columnsHeader.cohort')}</th>\n                  <th className=\"px-3 py-2 font-medium\">{t('columnsHeader.role')}</th>\n                  <th className=\"px-3 py-2 font-medium\">{t('columnsHeader.note')}</th>"],
  ["STATUS_LABEL[r.status].className)}>\n                        {STATUS_LABEL[r.status].text}", "STATUS_CLASS[r.status])}>\n                        {t(`status.${r.status}`)}"],
  ["{r.cohortNumber ? `${r.cohortNumber}기` : '-'}", "{r.cohortNumber ? tc('cohort', { number: r.cohortNumber }) : '-'}"],
  ["{r.role === 'admin' ? '운영진' : '회원'}</td>\n                    <td className=\"px-3 py-2 text-gray-400\">{r.reason}</td>", "{r.role === 'admin' ? t('roleAdmin') : t('roleMember')}</td>\n                    <td className=\"px-3 py-2 text-gray-400\">{r.reason ? reasonText(r.reason) : null}</td>"],
  ['<span className="block font-semibold">운영진 권한이 부여되는 행이 있습니다.</span>', "<span className=\"block font-semibold\">{t('adminWarnTitle')}</span>"],
  ['<span className="block text-sm text-amber-200/80 mt-1">이 이메일로 로그인하면 모든 자료·명단을 관리할 수 있습니다. 맞는 사람인지 확인해 주세요.</span>', "<span className=\"block text-sm text-amber-200/80 mt-1\">{t('adminWarnBody')}</span>"],
  ['                  확인했습니다\n', "                  {t('adminConfirm')}\n"],
  ['              {importable.length}명 확정', "              {t('commit', { count: importable.length })}"],
  ['              취소\n', "              {t('cancel')}\n"],
  ['<span className="text-sm text-gray-500">오류·중복 행은 확정에서 제외됩니다.</span>', "<span className=\"text-sm text-gray-500\">{t('excluded')}</span>"],
  ['            등록된 명단 <span className="text-gray-500 font-normal text-base">{entries.length}명</span>', "            {t('registered')} <span className=\"text-gray-500 font-normal text-base\">{entries.length}</span>"],
  ['placeholder="이름·이메일·기수 검색"\n            aria-label="명단 검색"', "placeholder={t('searchPlaceholder')}\n            aria-label={t('searchAria')}"],
  ['            아직 등록된 명단이 없습니다. 위에서 CSV를 올려 주세요.', "            {t('emptyRoster')}"],
  ['<th className="px-3 py-2 font-medium">이름</th>\n                  <th className="px-3 py-2 font-medium">이메일</th>\n                  <th className="px-3 py-2 font-medium">기수</th>\n                  <th className="px-3 py-2 font-medium">역할</th>\n                  <th className="px-3 py-2 font-medium">가입</th>', "<th className=\"px-3 py-2 font-medium\">{t('columnsHeader.name')}</th>\n                  <th className=\"px-3 py-2 font-medium\">{t('columnsHeader.email')}</th>\n                  <th className=\"px-3 py-2 font-medium\">{t('columnsHeader.cohort')}</th>\n                  <th className=\"px-3 py-2 font-medium\">{t('columnsHeader.role')}</th>\n                  <th className=\"px-3 py-2 font-medium\">{t('joinedHeader')}</th>"],
  ['<td className="px-3 py-2 text-gray-200">{e.cohortNumber}기</td>', "<td className=\"px-3 py-2 text-gray-200\">{tc('cohort', { number: e.cohortNumber })}</td>"],
  ["{e.role === 'admin' ? '운영진' : '회원'}</td>", "{e.role === 'admin' ? t('roleAdmin') : t('roleMember')}</td>"],
  ["{e.joined ? '가입 완료' : '미가입'}", "{e.joined ? t('joined') : t('notJoined')}"],
  ['<p className="px-3 py-2 text-sm text-gray-500">검색으로 범위를 좁혀 주세요. (상위 500명만 표시)</p>', "<p className=\"px-3 py-2 text-sm text-gray-500\">{t('narrow')}</p>"],
  ['<p className="px-3 py-4 text-sm text-gray-500">검색 결과가 없습니다.</p>', "<p className=\"px-3 py-4 text-sm text-gray-500\">{t('noResults')}</p>"],
])

// ---------- 문구 파일에 빠진 키 추가 (표 머리글 "가입") ----------
for (const [loc, value] of [['en', 'Signed up'], ['ko', '가입']]) {
  const p = `src/messages/${loc}/admin.json`
  const j = JSON.parse(rd(p))
  j.admin.roster.joinedHeader = value
  wr(p, JSON.stringify(j, null, 2) + '\n')
}

// ---------- StatsCharts (서버 컴포넌트: useTranslations 는 동기 서버 컴포넌트에서도 동작) ----------
rep('src/features/admin/components/StatsCharts.tsx', [
  ["import Link from 'next/link'", "import Link from 'next/link'\nimport { useTranslations } from 'next-intl'"],
  ["const Empty = ({ children = '아직 기록이 없습니다.' }: { children?: React.ReactNode }) => (\n  <p className=\"text-base text-gray-500 py-4\">{children}</p>\n)", "function Empty() {\n  const t = useTranslations('admin.stats')\n  return <p className=\"text-base text-gray-500 py-4\">{t('empty')}</p>\n}"],
  ["export function CohortBars({ rows }: { rows: CohortUsers[] }) {\n  const widths", "export function CohortBars({ rows }: { rows: CohortUsers[] }) {\n  const t = useTranslations('admin.stats.cohorts')\n  const tc = useTranslations('common')\n  const widths"],
  ['<Panel title="기수별 접속자" note="최근 30일, 기수별로 접속한 회원 수" testId="chart-cohorts">', "<Panel title={t('title')} note={t('note')} testId=\"chart-cohorts\">"],
  ['<span className="w-10 shrink-0 text-gray-300">{r.cohortNumber}기</span>', '<span className="w-16 shrink-0 text-gray-300">{tc(\'cohort\', { number: r.cohortNumber })}</span>'],
  ['<span className="w-10 shrink-0 text-right font-semibold text-white">{r.users}명</span>', '<span className="w-24 shrink-0 text-right font-semibold text-white">{t(\'users\', { count: r.users })}</span>'],
  ["export function WeeklyLine({ rows }: { rows: WeekUsers[] }) {\n", "export function WeeklyLine({ rows }: { rows: WeekUsers[] }) {\n  const t = useTranslations('admin.stats.weekly')\n"],
  ['<Panel title="주간 접속자" note="최근 12주, 주마다 접속한 회원 수" testId="chart-weekly">', "<Panel title={t('title')} note={t('note')} testId=\"chart-weekly\">"],
  ['aria-label={`최근 12주 주간 접속자 추이. 이번 주 ${last?.users ?? 0}명, 최고 ${max}명`}', "aria-label={t('aria', { last: last?.users ?? 0, max })}"],
  ['              이번 주 <b className="text-gray-200">{last?.users ?? 0}명</b> · 최고 {max}명', "              {t.rich('summary', { last: last?.users ?? 0, max, b: (chunks) => <b className=\"text-gray-200\">{chunks}</b> })}"],
  ["export function DeviceDonut({ device }: { device: AdminStats['device'] }) {\n", "export function DeviceDonut({ device }: { device: AdminStats['device'] }) {\n  const t = useTranslations('admin.stats.device')\n"],
  ["const LABEL: Record<string, string> = { mobile: '모바일', desktop: 'PC', other: '기타' }", "const LABEL: Record<string, string> = { mobile: t('mobile'), desktop: t('desktop'), other: t('other') }"],
  ['<Panel title="모바일 vs PC" note="최근 30일 접속 기록 기준 (사람 수가 아니라 접속 횟수)" testId="chart-device">', "<Panel title={t('title')} note={t('note')} testId=\"chart-device\">"],
  ['aria-label={`모바일 ${mobile}%`}', "aria-label={t('aria', { percent: mobile ?? 0 })}"],
  ['<span className="text-gray-500">({s.value}회)</span>', "<span className=\"text-gray-500\">{t('times', { count: s.value })}</span>"],
  ["export function TopResources({ rows }: { rows: TopResource[] }) {\n", "export function TopResources({ rows }: { rows: TopResource[] }) {\n  const t = useTranslations('admin.stats.top')\n"],
  ['<Panel title="인기 자료 Top 10" note="최근 30일, 다운로드 → 조회 순" testId="chart-top-resources">', "<Panel title={t('title')} note={t('note')} testId=\"chart-top-resources\">"],
  ['                다운로드 <b className="text-white">{r.downloads}</b> · 조회 <b className="text-white">{r.views}</b>', "                {t.rich('counts', { downloads: r.downloads, views: r.views, b: (chunks) => <b className=\"text-white\">{chunks}</b> })}"],
])

// ---------- 관리자 대시보드 ----------
rep('src/app/(admin)/admin/page.tsx', [
  ["import { redirect } from 'next/navigation'", "import { redirect } from 'next/navigation'\nimport { getLocale, getTranslations } from 'next-intl/server'"],
  ["export default async function AdminDashboardPage() {\n  const { supabase, profile }", "export default async function AdminDashboardPage() {\n  const t = await getTranslations('admin.dashboard')\n  const locale = await getLocale()\n  const { supabase, profile }"],
  [
    "    { label: '활성 회원', value: stats.membersActive, href: '/admin/roster' },\n    { label: '가입 완료율', value: formatRate(stats.signupRate), sub: `명단 ${stats.rosterTotal}명 중 ${stats.rosterClaimed}명`, href: '/admin/roster' },\n    { label: '최근 30일 접속자', value: stats.mau, sub: '접속 기록이 있는 회원 수(MAU)' },\n    { label: '승인 대기', value: stats.membersPending, href: '/admin/approvals', highlight: stats.membersPending > 0 },",
    "    { label: t('kpi.activeMembers'), value: stats.membersActive, href: '/admin/roster' },\n    { label: t('kpi.signupRate'), value: formatRate(stats.signupRate), sub: t('kpi.signupSub', { total: stats.rosterTotal, claimed: stats.rosterClaimed }), href: '/admin/roster' },\n    { label: t('kpi.mau'), value: stats.mau, sub: t('kpi.mauSub') },\n    { label: t('kpi.pending'), value: stats.membersPending, href: '/admin/approvals', highlight: stats.membersPending > 0 },",
  ],
  ["  const STATUS_LABEL = { queued: '대기', processing: '처리 중', done: '완료', failed: '실패(재시도 예정)' } as const\n", ''],
  ['text-white">관리자</h1>', "text-white\">{tt('dashboard')}</h1>"],
  ['          통계를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.', "          {t('statsError')}"],
  ['text-white">이메일 알림</h2>', "text-white\">{t('mail.title')}</h2>"],
  ["              ? '개발 모드: 메일을 실제로 보내지 않고 서버 로그에만 남깁니다.'\n              : '이메일 서비스가 연결되어 있습니다. 자료·공지를 올릴 때 알림을 보낼 수 있습니다.'\n            : '이메일 서비스가 아직 설정되지 않았습니다. 설정 전에는 알림 체크박스가 비활성이며, 자료·공지는 알림 없이 공개됩니다.'}", "              ? t('mail.dev')\n              : t('mail.on')\n            : t('mail.off')}"],
  ["{j.kind === 'resource' ? '새 자료' : '공지'}", "{j.kind === 'resource' ? t('mail.jobResource') : t('mail.jobAnnouncement')}"],
  ['<span>{STATUS_LABEL[j.status]}</span>', "<span>{t(`mail.status.${j.status}`)}</span>"],
  ['<span>성공 {c.sent}명</span>', "<span>{t('mail.sent', { count: c.sent })}</span>"],
  ['<span className="text-amber-300">실패 {c.failed}명</span>', "<span className=\"text-amber-300\">{t('mail.failed', { count: c.failed })}</span>"],
  ['{formatRelativeTime(j.created_at)}', '{formatRelativeTime(j.created_at, locale)}'],
])
{
  // titles 번역기(tt)를 dashboard 번역기(t) 옆에 추가
  let d = rd('src/app/(admin)/admin/page.tsx')
  d = d.replace("  const t = await getTranslations('admin.dashboard')\n", "  const t = await getTranslations('admin.dashboard')\n  const tt = await getTranslations('admin.titles')\n")
  wr('src/app/(admin)/admin/page.tsx', d)
}

// ---------- API 오류 메시지: 개발·로그용 영어. 사용자에게는 오류 코드로 현재 언어 문구를 보여 준다 ----------
const API_MSG = [
  ['일시적인 오류입니다. 잠시 후 다시 시도해 주세요.', 'Something went wrong. Please try again later.'],
  ['자료를 찾을 수 없습니다.', 'Resource not found.'],
  ['운영진만 사용할 수 있습니다.', 'Administrators only.'],
  ['로그인이 필요합니다.', 'Sign-in required.'],
  ['요청 형식이 올바르지 않습니다.', 'Invalid request format.'],
  ['요청 내용을 확인해 주세요.', 'Invalid request body.'],
  ['CSV 파일을 업로드해 주세요.', 'Please upload a CSV file.'],
  ['열람 권한이 없습니다.', 'Not allowed to view this resource.'],
  ['인증이 필요합니다.', 'Authentication required.'],
  ['파일을 찾을 수 없습니다. 운영진에게 문의해 주세요.', 'File not found.'],
  ['대상을 찾을 수 없습니다.', 'Target not found.'],
  ['입력 값을 확인해 주세요.', 'Invalid input.'],
  ['빈 파일입니다.', 'The file is empty.'],
  ["CSV 파일(.csv)만 올릴 수 있습니다.", 'Only .csv files are accepted.'],
  ['처리 중 오류가 발생했습니다.', 'Processing failed.'],
  ['오류가 있는 행이 포함되어 있습니다. 미리보기를 다시 확인해 주세요.', 'Some rows have errors. Please review the preview again.'],
  ['운영진 권한이 부여되는 행이 있습니다. 확인 후 다시 진행해 주세요.', 'Some rows grant administrator access. Confirmation is required.'],
]
for (const f of ['src/app/api/admin/publish/route.ts', 'src/app/api/admin/roster/commit/route.ts', 'src/app/api/admin/roster/preview/route.ts', 'src/app/api/cron/notify/route.ts', 'src/app/api/resources/[id]/download/route.ts']) {
  let s = rd(f)
  for (const [ko, en] of API_MSG) s = s.split(`'${ko}'`).join(`'${en}'`)
  wr(f, s)
}
rep('src/app/api/admin/roster/preview/route.ts', [
  ["`파일이 너무 큽니다. (최대 ${MAX_ROSTER_FILE_BYTES / 1024 / 1024}MB)`", "`File too large (max ${MAX_ROSTER_FILE_BYTES / 1024 / 1024}MB).`"],
  ["  if (parsed.error) return apiError('INVALID_FILE', parsed.error, 400)", "  // 파일 안의 문제는 키와 값(details.reason)으로 돌려주고, 화면이 현재 언어로 번역한다\n  if (parsed.error) return apiError('INVALID_FILE', `Invalid roster file: ${parsed.error.key}`, 400, { reason: parsed.error })"],
])
console.log('P3 3차 완료')
