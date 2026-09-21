// 임시: P3 (관리자) 2차 — 자료 관리 표/폼, 명단 관리, 통계, 대시보드, 업로드 검증, API 오류 메시지
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

// ---------- fileType.ts: 업로드 검증 오류를 키로 ----------
rep('src/features/library/fileType.ts', [
  [
    "/** 업로드 전 검증. 문제가 없으면 null, 있으면 사용자에게 보여줄 문구 */\nexport function validateUpload(file: { name: string; size: number }): string | null {\n  const ext = extensionOf(file.name)\n  if (!(UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {\n    return `올릴 수 없는 파일 형식입니다. (${UPLOAD_EXTENSIONS.join(', ')})`\n  }\n  if (file.size === 0) return '빈 파일입니다.'\n  if (file.size > MAX_UPLOAD_BYTES) {\n    return `파일이 너무 큽니다. (최대 ${MAX_UPLOAD_BYTES / 1024 / 1024}MB) 큰 영상은 외부 링크로 등록해 주세요.`\n  }\n  return null\n}",
    "/** 업로드 검증 오류: key 는 admin.upload.* 문구이고 나머지는 문구의 자리표시자 값이다 */\nexport type UploadError = { key: 'badType'; extensions: string } | { key: 'empty' } | { key: 'tooLarge'; max: number }\n\n/** 업로드 전 검증. 문제가 없으면 null */\nexport function validateUpload(file: { name: string; size: number }): UploadError | null {\n  const ext = extensionOf(file.name)\n  if (!(UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {\n    return { key: 'badType', extensions: UPLOAD_EXTENSIONS.join(', ') }\n  }\n  if (file.size === 0) return { key: 'empty' }\n  if (file.size > MAX_UPLOAD_BYTES) return { key: 'tooLarge', max: MAX_UPLOAD_BYTES / 1024 / 1024 }\n  return null\n}",
  ],
])

// ---------- ResourceAdminTable ----------
rep('src/features/admin/components/ResourceAdminTable.tsx', [
  ["import { Loader2 } from 'lucide-react'", "import { Loader2 } from 'lucide-react'\nimport { useLocale, useTranslations } from 'next-intl'"],
  ["import { CATEGORY_LABEL, type Category } from '@/features/library/params'", "import type { Category } from '@/features/library/params'"],
  ["import { describeNotification, publishWithNotify } from '../publishClient'", "import { publishWithNotify, type NotificationResult } from '../publishClient'\nimport { useNoticeText } from '../useNoticeText'"],
  ["initialNotice = null }: { rows: AdminResourceRow[]; emailEnabled?: boolean; initialNotice?: string | null }) {\n  const router = useRouter()", "initialNotice = null }: { rows: AdminResourceRow[]; emailEnabled?: boolean; initialNotice?: NotificationResult | null }) {\n  const t = useTranslations('admin.resources')\n  const tc = useTranslations('common')\n  const tl = useTranslations('library')\n  const locale = useLocale()\n  const text = useNoticeText()\n  const router = useRouter()"],
  ['useState<string | null>(initialNotice)', 'useState<string | null>(() => text.notice(initialNotice))'],
  ["return e ? { message: '공개하지 못했습니다. 잠시 후 다시 시도해 주세요.' } : null", "return e ? { message: t('errPublish') } : null"],
  ["return e ? { message: '비공개로 바꾸지 못했습니다.' } : null", "return e ? { message: t('errPrivate') } : null"],
  ['window.confirm(`"${row.title}" 자료를 삭제할까요?\\n삭제하면 되돌릴 수 없습니다.`)', "window.confirm(t('confirmDelete', { title: row.title }))"],
  ["if (e) return { message: '삭제하지 못했습니다.' }", "if (e) return { message: t('errDelete') }"],
  ["return setError('공개할 미공개 자료를 선택해 주세요.')", "return setError(t('errNoneSelected'))"],
  ["setError(`${failed}건은 공개하지 못했습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.`)", "setError(t('errBulkFailed', { count: failed }))"],
  ["setNotice(`${done}건을 알림 없이 공개했습니다.`)", "setNotice(t('bulkDone', { count: done }))"],
  ["['all', `전체 ${counts.all}`],\n            ['published', `공개 ${counts.published}`],\n            ['draft', `미공개 ${counts.draft}`],", "['all', t('tabAll', { count: counts.all })],\n            ['published', t('tabPublished', { count: counts.published })],\n            ['draft', t('tabDraft', { count: counts.draft })],"],
  ['placeholder="제목 검색"\n          aria-label="자료 제목 검색"', "placeholder={t('searchPlaceholder')}\n          aria-label={t('searchAria')}"],
  ['미공개 자료 전체 선택 ({selectableIds.length}건)', "{t('selectDrafts', { count: selectableIds.length })}"],
  ["{progress ? `공개 중… ${progress.done}/${progress.total}` : `선택한 ${selected.size}건 공개 (알림 없음)`}", "{progress ? t('bulkProgress', { done: progress.done, total: progress.total }) : t('bulkPublish', { count: selected.size })}"],
  ["{rows.length === 0 ? '등록된 자료가 없습니다. \"자료 올리기\"로 첫 자료를 등록해 주세요.' : '조건에 맞는 자료가 없습니다.'}", "{rows.length === 0 ? t('empty') : t('noMatch')}"],
  ['aria-label={`${r.title} 선택`}', "aria-label={t('selectAria', { title: r.title })}"],
  ["{r.isPublished ? '공개' : '미공개'}", "{r.isPublished ? t('published') : t('draft')}"],
  ["<span>{r.cohortNumber !== null ? `${r.cohortNumber}기` : '공용'}</span>", "<span>{r.cohortNumber !== null ? tc('cohort', { number: r.cohortNumber }) : t('common')}</span>"],
  ['<span>· {CATEGORY_LABEL[r.category]}</span>', '<span>· {tl(`categories.${r.category}`)}</span>'],
  ['<span>· 다운로드 {r.downloadCount}</span>', "<span>· {t('downloads', { count: r.downloadCount })}</span>"],
  ['<span>· {formatDate(r.createdAt)}</span>', '<span>· {formatDate(r.createdAt, locale)}</span>'],
  ['{!r.storagePath && <span>· 링크</span>}', "{!r.storagePath && <span>· {t('link')}</span>}"],
  ['                    비공개로\n', "                    {t('makePrivate')}\n"],
  ["aria-hidden /> : '공개'}", "aria-hidden /> : t('publish')}"],
  ['                        공개 + 알림\n', "                        {t('publishNotify')}\n"],
  ['                  수정\n', "                  {t('edit')}\n"],
  ['                  삭제\n', "                  {t('delete')}\n"],
])

// ---------- ResourceForm ----------
rep('src/features/admin/components/ResourceForm.tsx', [
  ["import { Loader2 } from 'lucide-react'", "import { Loader2 } from 'lucide-react'\nimport { useTranslations } from 'next-intl'"],
  ["import { CATEGORIES, CATEGORY_LABEL, MAX_WEEK, type Category }", "import { CATEGORIES, MAX_WEEK, type Category }"],
  ["import { noticeQuery, publishWithNotify } from '../publishClient'", "import { noticeQuery, publishWithNotify } from '../publishClient'"],
  ["export function ResourceForm({ mode, cohorts, userId, initial, emailEnabled = false }: Props) {\n  const router = useRouter()", "export function ResourceForm({ mode, cohorts, userId, initial, emailEnabled = false }: Props) {\n  const t = useTranslations('admin.resourceForm')\n  const tu = useTranslations('admin.upload')\n  const tt = useTranslations('library.tagErrors')\n  const tl = useTranslations('library')\n  const tc = useTranslations('common')\n  const router = useRouter()"],
  ["return setError('제목을 입력해 주세요.')", "return setError(t('errTitle'))"],
  ["return setError('제목은 200자 이내로 입력해 주세요.')", "return setError(t('errTitleLong'))"],
  ["return setError('설명은 5,000자 이내로 입력해 주세요.')", "return setError(t('errDescriptionLong'))"],
  ["    if (parsedTags.error) return setError(parsedTags.error)", "    if (parsedTags.error) {\n      const e = parsedTags.error\n      return setError(tt(e.key, { max: e.max, tag: 'tag' in e ? e.tag : '' }))\n    }"],
  ["return setError('올릴 파일을 선택해 주세요.')", "return setError(t('errNoFile'))"],
  ["        if (problem) return setError(problem)", "        if (problem) return setError(tu(problem.key, { extensions: 'extensions' in problem ? problem.extensions : '', max: 'max' in problem ? problem.max : 0 }))"],
  ["return setError('링크는 https:// 로 시작하는 주소만 등록할 수 있습니다.')", "return setError(t('errLinkHttps'))"],
  ["return setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')", "return setError(t('errSave'))"],
  ["return setError(upErr.message.includes('exceeded') ? '파일이 허용 크기를 넘습니다.' : '파일을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.')", "return setError(upErr.message.includes('exceeded') ? t('errFileTooBig') : t('errUpload'))"],
  ["        setError('자료는 저장됐지만 공개하지 못했습니다. 목록에서 \"공개\"를 눌러 주세요.')", "        setError(t('errPublishAfterSave'))"],
  ['<label htmlFor="title" className={label}>제목</label>', "<label htmlFor=\"title\" className={label}>{t('title')}</label>"],
  ['placeholder="예: 12기 3주차 RAG 강의노트"', "placeholder={t('titlePlaceholder')}"],
  ['<label htmlFor="category" className={label}>카테고리</label>', "<label htmlFor=\"category\" className={label}>{t('category')}</label>"],
  ['<option key={c} value={c}>{CATEGORY_LABEL[c]}</option>', '<option key={c} value={c}>{tl(`categories.${c}`)}</option>'],
  ['<label htmlFor="cohort" className={label}>기수</label>', "<label htmlFor=\"cohort\" className={label}>{t('cohort')}</label>"],
  ['<option value="">공용 (전체 기수)</option>', "<option value=\"\">{t('commonAll')}</option>"],
  ['<option key={c.id} value={c.id}>{c.number}기</option>', "<option key={c.id} value={c.id}>{tc('cohort', { number: c.number })}</option>"],
  ['<label htmlFor="week" className={label}>주차 <span className="text-gray-500 font-normal">(선택)</span></label>', "<label htmlFor=\"week\" className={label}>{t('week')} <span className=\"text-gray-500 font-normal\">{t('optional')}</span></label>"],
  ['<option value="">없음</option>', "<option value=\"\">{t('none')}</option>"],
  ['<option key={w} value={w}>{w}주차</option>', "<option key={w} value={w}>{t('weekOption', { number: w })}</option>"],
  ['<legend className={label}>자료 원본</legend>', "<legend className={label}>{t('source')}</legend>"],
  ["{s === 'file' ? '파일 올리기' : '외부 링크'}", "{s === 'file' ? t('sourceFile') : t('sourceLink')}"],
  ['<p className="text-base text-gray-300">파일을 여기로 끌어오거나 아래에서 선택하세요.</p>', "<p className=\"text-base text-gray-300\">{t('drop')}</p>"],
  ["                {UPLOAD_EXTENSIONS.join(', ')} · 최대 {MAX_UPLOAD_BYTES / 1024 / 1024}MB. 큰 영상은 외부 링크(YouTube 비공개 등)로 등록해 주세요.", "                {t('limits', { extensions: UPLOAD_EXTENSIONS.join(', '), max: MAX_UPLOAD_BYTES / 1024 / 1024 })}"],
  ['<p className="text-sm text-gray-300">선택한 파일: {file.name} ({formatFileSize(file.size)})</p>', "<p className=\"text-sm text-gray-300\">{t('selectedFile', { name: file.name, size: formatFileSize(file.size) })}</p>"],
  ['<label htmlFor="url" className="sr-only">외부 링크 주소</label>', "<label htmlFor=\"url\" className=\"sr-only\">{t('linkLabel')}</label>"],
  ['placeholder="https://youtu.be/…" className={field} />', "placeholder={t('linkPlaceholder')} className={field} />"],
  ['<p className="text-sm text-gray-500 mt-2">https:// 주소만 등록할 수 있습니다. YouTube·Vimeo 는 화면에서 바로 재생됩니다.</p>', "<p className=\"text-sm text-gray-500 mt-2\">{t('linkNote')}</p>"],
  ['<label htmlFor="url" className={label}>외부 링크 주소</label>', "<label htmlFor=\"url\" className={label}>{t('linkLabel')}</label>"],
  ['<p className="text-sm text-gray-500">저장된 파일은 수정 화면에서 바꿀 수 없습니다. 파일을 바꾸려면 새 자료로 등록하고 기존 자료를 삭제해 주세요.</p>', "<p className=\"text-sm text-gray-500\">{t('fileLocked')}</p>"],
  ['<label htmlFor="tags" className={label}>태그 <span className="text-gray-500 font-normal">(쉼표로 구분, 선택)</span></label>', "<label htmlFor=\"tags\" className={label}>{t('tags')} <span className=\"text-gray-500 font-normal\">{t('tagsHint')}</span></label>"],
  ['placeholder="예: RAG, 프롬프트, 실습"', "placeholder={t('tagsPlaceholder')}"],
  ['<label htmlFor="description" className={label}>설명 <span className="text-gray-500 font-normal">(선택)</span></label>', "<label htmlFor=\"description\" className={label}>{t('description')} <span className=\"text-gray-500 font-normal\">{t('optional')}</span></label>"],
  ['px-1 text-sm font-medium text-gray-300">공개 설정</legend>', "px-1 text-sm font-medium text-gray-300\">{t('publishing')}</legend>"],
  ['            저장하고 바로 공개\n', "            {t('publishNow')}\n"],
  ["            이메일 알림 발송\n            {!emailEnabled ? ' (이메일 서비스 설정 전)' : !publish ? ' (바로 공개를 선택하면 사용할 수 있습니다)' : ''}", "            {t('notify')}\n            {!emailEnabled ? t('notifyNoEmail') : !publish ? t('notifyNeedPublish') : ''}"],
  ['<p className="text-sm text-gray-500">공개하지 않고 저장하면 운영진에게만 보입니다. 목록에서 검수한 뒤 공개할 수 있습니다.</p>', "<p className=\"text-sm text-gray-500\">{t('publishNote')}</p>"],
  ["{busy === 'uploading' ? '파일 올리는 중…' : busy === 'saving' ? '저장 중…' : isEdit ? '저장' : '등록'}", "{busy === 'uploading' ? t('uploading') : busy === 'saving' ? t('saving') : isEdit ? t('submitSave') : t('submitCreate')}"],
  ['          취소\n        </button>', "          {t('cancel')}\n        </button>"],
  ['<p role="status" className="text-sm text-gray-400">파일 크기에 따라 시간이 걸릴 수 있습니다. 창을 닫지 말고 기다려 주세요.</p>', "<p role=\"status\" className=\"text-sm text-gray-400\">{t('uploadWait')}</p>"],
])

// ---------- roster.ts: 검증 사유·파일 오류를 키로 ----------
rep('src/features/admin/services/roster.ts', [
  [
    "  claimed?: boolean\n  reason?: string\n}",
    "  claimed?: boolean\n  reason?: RosterReason\n}\n\n/** 행 검증 사유: key 는 admin.roster.reasons.* 문구이고 value·cohort 는 문구의 자리표시자 값이다 */\nexport type RosterReason =\n  | { key: 'emailEmpty' | 'emailFormat' | 'nameEmpty' | 'duplicateInFile' | 'alreadyClaimed' | 'alreadyListed' }\n  | { key: 'cohortUnreadable' | 'roleInvalid'; value: string }\n  | { key: 'cohortUnknown'; cohort: number }\n\n/** 파일 전체 오류: key 는 admin.roster.fileErrors.* 문구이다 */\nexport type RosterFileError =\n  | { key: 'missingColumns'; columns: string }\n  | { key: 'noRows' }\n  | { key: 'tooManyRows'; max: number; count: number }",
  ],
  ['export type ParseResult = { rows: ParsedRosterRow[]; error?: string }', 'export type ParseResult = { rows: ParsedRosterRow[]; error?: RosterFileError }'],
  [
    "    const label = { email: 'email(이메일)', name: 'name(이름)', cohort: 'cohort_number(기수)' } as const\n    return { rows: [], error: `필수 열이 없습니다: ${missing.map((m) => label[m]).join(', ')}` }",
    "    // 열 이름은 CSV 에 실제로 쓰는 이름(영어)으로 안내한다\n    const label = { email: 'email', name: 'name', cohort: 'cohort_number' } as const\n    return { rows: [], error: { key: 'missingColumns', columns: missing.map((m) => label[m]).join(', ') } }",
  ],
  ["return { rows: [], error: '데이터 행이 없습니다.' }", "return { rows: [], error: { key: 'noRows' } }"],
  ["return { rows: [], error: `한 번에 ${MAX_ROSTER_ROWS}행까지 등록할 수 있습니다. (현재 ${rows.length}행)` }", "return { rows: [], error: { key: 'tooManyRows', max: MAX_ROSTER_ROWS, count: rows.length } }"],
  ["const invalid = (reason: string): ValidatedRosterRow => ({", "const invalid = (reason: RosterReason): ValidatedRosterRow => ({"],
  ["return invalid('이메일이 비어 있습니다.')", "return invalid({ key: 'emailEmpty' })"],
  ["return invalid('이메일 형식이 올바르지 않습니다.')", "return invalid({ key: 'emailFormat' })"],
  ["return invalid('이름이 비어 있습니다.')", "return invalid({ key: 'nameEmpty' })"],
  ['return invalid(`기수 값을 읽을 수 없습니다: "${row.cohortRaw}"`)', "return invalid({ key: 'cohortUnreadable', value: row.cohortRaw })"],
  ["return invalid(`존재하지 않는 기수입니다: ${cohortNumber}기`)", "return invalid({ key: 'cohortUnknown', cohort: cohortNumber })"],
  ['return invalid(`역할 값이 올바르지 않습니다: "${row.roleRaw}" (member 또는 admin)`)', "return invalid({ key: 'roleInvalid', value: row.roleRaw })"],
  ["reason: '파일 안에서 이메일이 중복됩니다. (첫 번째 행만 사용)'", "reason: { key: 'duplicateInFile' }"],
  ["reason: existing.claimed ? '이미 가입한 회원입니다. (수정되지 않음)' : '이미 명단에 있습니다. (내용을 갱신)',", "reason: { key: existing.claimed ? 'alreadyClaimed' : 'alreadyListed' },"],
])
{
  // 입력 해석용 한글(열 이름·역할 별칭·"기" 접미사)은 화면 문구가 아니라 CSV 를 읽는 규칙이다
  let r = rd('src/features/admin/services/roster.ts')
  r = r.replace("  email: 'email', 'e-mail': 'email', 이메일: 'email', 메일: 'email',", "  email: 'email', 'e-mail': 'email', 이메일: 'email', 메일: 'email', // i18n-ignore: 한글 열 이름도 인식")
  r = r.replace("  name: 'name', 이름: 'name', 성명: 'name',", "  name: 'name', 이름: 'name', 성명: 'name', // i18n-ignore")
  r = r.replace("  cohort_number: 'cohort', cohort: 'cohort', 기수: 'cohort', 기수번호: 'cohort',", "  cohort_number: 'cohort', cohort: 'cohort', 기수: 'cohort', 기수번호: 'cohort', // i18n-ignore")
  r = r.replace("  role: 'role', 역할: 'role', 권한: 'role',", "  role: 'role', 역할: 'role', 권한: 'role', // i18n-ignore")
  r = r.replace("  if (v === '' || v === 'member' || v === '회원' || v === '졸업생' || v === '재학생') return 'member'", "  if (v === '' || v === 'member' || v === '회원' || v === '졸업생' || v === '재학생') return 'member' // i18n-ignore: 한글 역할 이름도 인식")
  r = r.replace("  if (v === 'admin' || v === '운영진' || v === '관리자') return 'admin'", "  if (v === 'admin' || v === '운영진' || v === '관리자') return 'admin' // i18n-ignore")
  wr('src/features/admin/services/roster.ts', r)
}
{
  let c = rd('src/features/admin/services/rosterContext.ts')
  c = c.split('cohorts 조회 실패').join('cohorts query failed').split('roster 조회 실패').join('roster query failed')
  wr('src/features/admin/services/rosterContext.ts', c)
}
console.log('P3 2차(자료·명단 서비스) 완료')
