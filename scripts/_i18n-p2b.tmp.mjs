// 임시: P2 나머지(공지 상세, 내 정보 화면들, 프로필 검증)를 번역 키로 바꾼다
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

rep('src/app/(main)/announcements/[id]/page.tsx', [
  ['  if (!z.uuid().safeParse(params.id).success) notFound()\n\n  const { supabase, user, profile }', "  if (!z.uuid().safeParse(params.id).success) notFound()\n\n  const t = await getTranslations('announcements')\n  const locale = await getLocale()\n  const { supabase, user, profile }"],
])

// ---------- profile.ts: 오류를 문구 키로 ----------
rep('src/features/me/profile.ts', [
  [
    "export type ProfileValidation = { ok: true; value: ProfileValue } | { ok: false; errors: Partial<Record<ProfileField, string>> }",
    "/** 링크 필드 (오류 문구의 {label} 은 me.fields.<field> 를 번역한 값) */\nexport type UrlField = 'github_url' | 'linkedin_url' | 'website_url'\n\n/** 입력 오류: key 는 me.profileErrors.* 문구이고 나머지는 문구의 자리표시자 값이다 */\nexport type ProfileError =\n  | { key: 'nameRequired' }\n  | { key: 'nameTooLong' | 'companyTooLong' | 'positionTooLong' | 'bioTooLong'; max: number }\n  | { key: 'urlTooLong' | 'urlHttps'; field: UrlField }\n  | { key: 'urlHost'; field: UrlField; host: string }\n\nexport type ProfileValidation = { ok: true; value: ProfileValue } | { ok: false; errors: Partial<Record<ProfileField, ProfileError>> }",
  ],
  ['  const errors: Partial<Record<ProfileField, string>> = {}', '  const errors: Partial<Record<ProfileField, ProfileError>> = {}'],
  ["  if (!name) errors.name = '이름을 입력해 주세요.'\n  else if (name.length > L.name) errors.name = `이름은 ${L.name}자 이내로 입력해 주세요.`", "  if (!name) errors.name = { key: 'nameRequired' }\n  else if (name.length > L.name) errors.name = { key: 'nameTooLong', max: L.name }"],
  ['  if (company.length > L.company) errors.company = `회사는 ${L.company}자 이내로 입력해 주세요.`', "  if (company.length > L.company) errors.company = { key: 'companyTooLong', max: L.company }"],
  ['  if (position.length > L.position) errors.position = `직책은 ${L.position}자 이내로 입력해 주세요.`', "  if (position.length > L.position) errors.position = { key: 'positionTooLong', max: L.position }"],
  ['  if (bio.length > L.bio) errors.bio = `소개는 ${L.bio}자 이내로 입력해 주세요.`', "  if (bio.length > L.bio) errors.bio = { key: 'bioTooLong', max: L.bio }"],
  ['  const url = (field: ProfileField, label: string, hosts?: readonly string[]): string | null => {', '  const url = (field: UrlField, hosts?: readonly string[]): string | null => {'],
  ['      errors[field] = `${label} 주소가 너무 깁니다.`', "      errors[field] = { key: 'urlTooLong', field }"],
  [
    "    if (!ok) errors[field] = hosts ? `${label} 주소를 https://${hosts[0]}/… 형식으로 입력해 주세요.` : `${label} 주소는 https:// 로 시작해야 합니다.`",
    "    if (!ok) errors[field] = hosts ? { key: 'urlHost', field, host: hosts[0] } : { key: 'urlHttps', field }",
  ],
  ["url('github_url', 'GitHub', ['github.com'])", "url('github_url', ['github.com'])"],
  ["url('linkedin_url', 'LinkedIn', ['linkedin.com'])", "url('linkedin_url', ['linkedin.com'])"],
  ["url('website_url', '웹사이트')", "url('website_url')"],
])

// ---------- ProfileForm ----------
rep('src/features/me/components/ProfileForm.tsx', [
  ["import { useRouter } from 'next/navigation'", "import { useRouter } from 'next/navigation'\nimport { useTranslations } from 'next-intl'"],
  ["import { PROFILE_LIMITS, validateProfile, type ProfileField, type ProfileInput } from '../profile'", "import { PROFILE_LIMITS, validateProfile, type ProfileError, type ProfileField, type ProfileInput } from '../profile'"],
  ['interface FieldSpec {\n  name: ProfileField\n  label: string\n  placeholder?: string', "interface FieldSpec {\n  name: ProfileField\n  placeholder?: string"],
  ["  hint?: string\n}", "  /** true 면 me.bioHint 문구를 보여 준다 */\n  hint?: boolean\n}"],
  ["  { name: 'name', label: '이름', autoComplete: 'name' },\n  { name: 'company', label: '회사', autoComplete: 'organization' },\n  { name: 'position', label: '직책', autoComplete: 'organization-title', placeholder: '예: 대표이사' },\n  { name: 'bio', label: '소개', multiline: true, hint: '다른 졸업생에게 보이는 한두 줄 소개입니다.' },\n  { name: 'github_url', label: 'GitHub', placeholder: 'https://github.com/…', inputMode: 'url' },\n  { name: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/…', inputMode: 'url' },\n  { name: 'website_url', label: '웹사이트', placeholder: 'https://…', inputMode: 'url' },",
    "  { name: 'name', autoComplete: 'name' },\n  { name: 'company', autoComplete: 'organization' },\n  { name: 'position', autoComplete: 'organization-title' },\n  { name: 'bio', multiline: true, hint: true },\n  { name: 'github_url', placeholder: 'https://github.com/…', inputMode: 'url' },\n  { name: 'linkedin_url', placeholder: 'https://www.linkedin.com/in/…', inputMode: 'url' },\n  { name: 'website_url', placeholder: 'https://…', inputMode: 'url' },"],
  ["export function ProfileForm({ userId, initial }: { userId: string; initial: ProfileInput }) {\n  const router = useRouter()", "export function ProfileForm({ userId, initial }: { userId: string; initial: ProfileInput }) {\n  const t = useTranslations('me')\n  const router = useRouter()"],
  ["useState<Partial<Record<ProfileField, string>>>({})", "useState<Partial<Record<ProfileField, ProfileError>>>({})"],
  ["useState<{ kind: 'ok' | 'error'; text: string } | null>(null)", "useState<{ kind: 'ok' | 'error'; text: string } | null>(null)\n  // 오류 문구는 저장하지 않고(언어를 바꾸면 따라 바뀌도록) 종류만 보관한 뒤 그릴 때 번역한다\n  const errorText = (e: ProfileError) => {\n    const label = 'field' in e ? t(`fields.${e.field}`) : ''\n    return t(`profileErrors.${e.key}`, { max: 'max' in e ? e.max : 0, label, host: 'host' in e ? e.host : '' })\n  }"],
  ["      return setMessage({ kind: 'error', text: '입력 내용을 확인해 주세요.' })", "      return setMessage({ kind: 'error', text: t('form.fixInput') })"],
  ["      const text = error.code === '23514' ? '입력 형식이 올바르지 않습니다. 링크는 https:// 로 시작해야 하고 글자 수 제한이 있습니다.' : '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'", "      const text = error.code === '23514' ? t('form.errFormat') : t('form.errSave')"],
  ["    setMessage({ kind: 'ok', text: '저장했습니다.' })", "    setMessage({ kind: 'ok', text: t('form.saved') })"],
  ['              {f.label}\n', "              {t(`fields.${f.name}`)}\n"],
  ['          placeholder: f.placeholder,', "          placeholder: f.name === 'position' ? t('positionPlaceholder') : f.placeholder,"],
  ['{f.hint && !err && <p className="mt-1 text-sm text-gray-500">{f.hint}</p>}', '{f.hint && !err && <p className="mt-1 text-sm text-gray-500">{t(\'bioHint\')}</p>}'],
  ['                {err}\n', '                {errorText(err)}\n'],
  ['        저장\n', "        {t('form.save')}\n"],
])

// ---------- NotificationSettings ----------
rep('src/features/me/components/NotificationSettings.tsx', [
  ["import { useState } from 'react'", "import { useState } from 'react'\nimport { useTranslations } from 'next-intl'"],
  [
    "const ITEMS: { key: Key; title: string; desc: string }[] = [\n  { key: 'notify_new_resource', title: '새 자료 알림', desc: '내가 볼 수 있는 새 자료가 올라오면 이메일로 알려 드립니다.' },\n  { key: 'notify_announcement', title: '공지 알림', desc: '운영진이 공지를 올리면 이메일로 알려 드립니다.' },\n]",
    "// text 는 me.notify.<text>.title / desc 문구의 이름이다\nconst ITEMS: { key: Key; text: 'newResource' | 'announcement' }[] = [\n  { key: 'notify_new_resource', text: 'newResource' },\n  { key: 'notify_announcement', text: 'announcement' },\n]",
  ],
  ["export function NotificationSettings({ userId, initial }: { userId: string; initial: Record<Key, boolean> }) {\n  const [values", "export function NotificationSettings({ userId, initial }: { userId: string; initial: Record<Key, boolean> }) {\n  const t = useTranslations('me.notify')\n  const [values"],
  ["      setError('설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')", "      setError(t('errSave'))"],
  ['{ITEMS.map(({ key, title, desc }) => (', '{ITEMS.map(({ key, text }) => ('],
  ['text-white">{title}</div>\n            <p className="text-sm text-gray-400">{desc}</p>', "text-white\">{t(`${text}.title`)}</div>\n            <p className=\"text-sm text-gray-400\">{t(`${text}.desc`)}</p>"],
  ["{values[key] ? '켜짐' : '꺼짐'}", "{values[key] ? t('on') : t('off')}"],
  ['지금은 알림 메일을 받지 않습니다. 새 자료와 공지는 포털에서 직접 확인해 주세요.', "{t('allOff')}"],
])
// 위 마지막 치환은 JSX 텍스트를 표현식으로 바꾸므로 감싸는 <p> 안에서 그대로 유효하다

// ---------- InstallHint ----------
rep('src/features/me/components/InstallHint.tsx', [
  ["import { Share, SquarePlus, Smartphone } from 'lucide-react'", "import { Share, SquarePlus, Smartphone } from 'lucide-react'\nimport { useTranslations } from 'next-intl'"],
  ["export function InstallHint() {\n", "export function InstallHint() {\n  const t = useTranslations('me.install')\n  const b = (chunks: React.ReactNode) => <b className=\"text-white\">{chunks}</b>\n"],
  ['className="text-lg font-semibold text-white">홈 화면에 추가</h2>', "className=\"text-lg font-semibold text-white\">{t('title')}</h2>"],
  ['aria-hidden /> 홈 화면에 추가하면 앱처럼 바로 열 수 있습니다.</p>', "aria-hidden /> {t('prompt')}</p>"],
  ['              홈 화면에 추가\n', "              {t('button')}\n"],
  ['<span>iPhone에서는 <b className="text-white">Safari</b>로 열어야 홈 화면에 추가할 수 있습니다. 카카오톡 등 앱 안에서 연 화면이라면 주소를 복사해 Safari에서 열어 주세요.</span>', "<span>{t.rich('iosOther', { b })}</span>"],
  ['aria-hidden /> Safari 아래의 <b className="text-white">공유</b> 버튼을 누릅니다.</li>', "aria-hidden /> {t.rich('step1', { b })}</li>"],
  ['aria-hidden /> <b className="text-white">홈 화면에 추가</b>를 선택합니다.</li>', "aria-hidden /> {t.rich('step2', { b })}</li>"],
])

// ---------- me/page.tsx ----------
rep('src/app/(main)/me/page.tsx', [
  ["import { LogOut, ShieldCheck } from 'lucide-react'", "import { LogOut, ShieldCheck } from 'lucide-react'\nimport { getTranslations } from 'next-intl/server'"],
  ["import { Avatar } from '@/components/ui/Avatar'", "import { Avatar } from '@/components/ui/Avatar'\nimport { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'"],
  ["export const metadata = { title: '내 프로필 — AI4CEO' }\n", "export async function generateMetadata() {\n  const t = await getTranslations('me')\n  return { title: t('metaTitle') }\n}\n"],
  ["export default async function MePage() {\n", "export default async function MePage() {\n  const t = await getTranslations('me')\n  const tc = await getTranslations('common')\n"],
  ['className="text-lg font-semibold text-white">프로필</h2>', "className=\"text-lg font-semibold text-white\">{t('profile')}</h2>"],
  ['className="text-sm text-gray-500">다른 졸업생이 멤버 화면에서 볼 수 있는 정보입니다. 이메일은 공개되지 않습니다.</p>', "className=\"text-sm text-gray-500\">{t('profileNote')}</p>"],
  ['className="text-lg font-semibold text-white">이메일 알림</h2>', "className=\"text-lg font-semibold text-white\">{t('notifications')}</h2>"],
  ['className="text-lg font-semibold text-white">계정</h2>', "className=\"text-lg font-semibold text-white\">{t('account')}</h2>"],
  ['<dt className="text-gray-400">이메일</dt>', "<dt className=\"text-gray-400\">{t('email')}</dt>"],
  ['<dt className="text-gray-400">기수</dt>', "<dt className=\"text-gray-400\">{t('cohort')}</dt>"],
  ["{cohortNumber !== null ? `${cohortNumber}기` : '-'}", "{cohortNumber !== null ? tc('cohort', { number: cohortNumber }) : '-'}"],
  ['<dt className="text-gray-400">상태</dt>', "<dt className=\"text-gray-400\">{t('status')}</dt>"],
  ["{profile.role === 'admin' ? '이용 중 (운영진)' : '이용 중'}", "{profile.role === 'admin' ? t('statusActiveAdmin') : t('statusActive')}"],
  ['className="text-sm text-gray-500">이메일이나 기수를 바꾸려면 운영진에게 문의해 주세요.</p>', "className=\"text-sm text-gray-500\">{t('contactAdmin')}</p>"],
  ['<ShieldCheck size={20} aria-hidden /> 관리자 화면', "<ShieldCheck size={20} aria-hidden /> {t('adminArea')}"],
  ['<LogOut size={18} aria-hidden /> 로그아웃', "<LogOut size={18} aria-hidden /> {t('signOut')}"],
])
console.log('P2 나머지 변환 완료')
