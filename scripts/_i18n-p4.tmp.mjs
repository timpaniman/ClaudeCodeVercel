// 임시: P4 — 알림 메일을 수신자 언어로. templates.ts 는 cleanSubject 의 제어문자 정규식을 보존하려고 일부만 교체한다.
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

// ---------- templates.ts ----------
{
  let s = rd('src/features/notifications/templates.ts')
  const cut = s.indexOf('interface CommonData {')
  if (cut < 0) throw new Error('CommonData not found')
  const head = s.slice(0, cut)
  const tail = `interface CommonData {
  /** 메일을 받는 사람이 쓰는 언어 */
  locale: Locale
  name: string
  title: string
  /** 포털에서 이 항목을 여는 주소 */
  url: string
  unsubscribeUrl: string
}

export interface ResourceEmailData extends CommonData {
  /** 기수 번호. null 이면 공용 자료 */
  cohortNumber: number | null
  category: Category
}

export interface AnnouncementEmailData extends CommonData {
  excerpt: string
}

const greeting = (locale: Locale, name: string) => {
  const c = emailCopy(locale)
  return name.trim() ? fill(c.greetingNamed, { name: name.trim() }) : c.greeting
}

function layout(locale: Locale, inner: string, unsubscribeUrl: string): string {
  const c = emailCopy(locale)
  const link = \`<a href="\${escapeHtml(unsubscribeUrl)}" style="color:#4f46e5">\${escapeHtml(c.unsubscribeLabel)}</a>\`
  return \`<div style="max-width:520px;margin:0 auto;padding:24px;font-family:-apple-system,'Segoe UI','Malgun Gothic',sans-serif;color:#111827;line-height:1.6">
\${inner}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px">
<p style="font-size:13px;color:#6b7280;margin:0">\${fill(c.footer, { brand: BRAND, unsubscribe: link })}</p>
</div>\`
}

const button = (url: string, label: string) =>
  \`<p style="margin:24px 0"><a href="\${escapeHtml(url)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:12px">\${escapeHtml(label)}</a></p>\`

export function buildResourceEmail(d: ResourceEmailData): EmailContent {
  const c = emailCopy(d.locale)
  const meta = resourceMeta(d.locale, d.cohortNumber, d.category)
  const hello = greeting(d.locale, d.name)
  return {
    subject: cleanSubject(fill(c.resource.subject, { brand: BRAND, title: d.title })),
    html: layout(
      d.locale,
      \`<p style="margin:0 0 12px">\${escapeHtml(hello)}</p>
<p style="margin:0 0 16px">\${escapeHtml(c.resource.intro)}</p>
<h2 style="margin:0 0 4px;font-size:20px">\${escapeHtml(d.title)}</h2>
<p style="margin:0;color:#6b7280">\${escapeHtml(meta)}</p>
\${button(d.url, c.resource.button)}\`,
      d.unsubscribeUrl,
    ),
    text: \`\${hello}\\n\\n\${c.resource.intro}\\n\\n\${d.title}\\n\${meta}\\n\\n\${fill(c.resource.textLink, { url: d.url })}\\n\\n---\\n\${fill(c.textUnsubscribe, { url: d.unsubscribeUrl })}\\n\`,
  }
}

export function buildAnnouncementEmail(d: AnnouncementEmailData): EmailContent {
  const c = emailCopy(d.locale)
  const hello = greeting(d.locale, d.name)
  return {
    subject: cleanSubject(fill(c.announcement.subject, { brand: BRAND, title: d.title })),
    html: layout(
      d.locale,
      \`<p style="margin:0 0 12px">\${escapeHtml(hello)}</p>
<p style="margin:0 0 16px">\${escapeHtml(c.announcement.intro)}</p>
<h2 style="margin:0 0 8px;font-size:20px">\${escapeHtml(d.title)}</h2>
\${d.excerpt ? \`<p style="margin:0;color:#374151">\${escapeHtml(d.excerpt)}</p>\` : ''}
\${button(d.url, c.announcement.button)}\`,
      d.unsubscribeUrl,
    ),
    text: \`\${hello}\\n\\n\${c.announcement.intro}\\n\\n\${d.title}\\n\${d.excerpt ? \`\${d.excerpt}\\n\` : ''}\\n\${fill(c.announcement.textLink, { url: d.url })}\\n\\n---\\n\${fill(c.textUnsubscribe, { url: d.unsubscribeUrl })}\\n\`,
  }
}
`
  const importLine = "import type { Locale } from '@/i18n/config'\nimport type { Category } from '@/features/library/params'\nimport { emailCopy, fill, resourceMeta } from './emailCopy'\n\n"
  wr('src/features/notifications/templates.ts', head.replace('const BRAND', importLine + 'const BRAND') + tail)
}

// ---------- process.ts ----------
rep('src/features/notifications/process.ts', [
  ["import { signUnsubscribeToken } from './unsubscribe'", "import { localeOf } from './emailCopy'\nimport { signUnsubscribeToken } from './unsubscribe'\nimport type { Category } from '@/features/library/params'"],
  ["  | { kind: 'resource'; id: string; title: string; cohortLabel: string; categoryLabel: string }", "  | { kind: 'resource'; id: string; title: string; cohortNumber: number | null; category: Category }"],
  ["export interface Recipient {\n  user_id: string\n  email: string\n  name: string\n}", "export interface Recipient {\n  user_id: string\n  email: string\n  name: string\n  /** 수신자가 쓰는 언어 (profiles.locale). 모르는 값이면 기본 언어로 보낸다 */\n  locale?: string | null\n}"],
  ["      name: recipient.name, title: subject.title, cohortLabel: subject.cohortLabel, categoryLabel: subject.categoryLabel,\n      url:", "      locale, name: recipient.name, title: subject.title, cohortNumber: subject.cohortNumber, category: subject.category,\n      url:"],
  ["    name: recipient.name, title: subject.title, excerpt: subject.excerpt,", "    locale, name: recipient.name, title: subject.title, excerpt: subject.excerpt,"],
  ["function buildContent(subject: Subject, recipient: Recipient, siteUrl: string, unsubscribeUrl: string): EmailContent {", "function buildContent(subject: Subject, recipient: Recipient, siteUrl: string, unsubscribeUrl: string): EmailContent {\n  const locale = localeOf(recipient.locale)"],
  // 관리자 화면(작업 기록)에 보이는 메모는 영어로
  ["'대상이 없어졌거나 공개되지 않아 발송하지 않았습니다.'", "'Nothing was sent: the item was removed or is not published.'"],
  ["`발송기 오류: ${e instanceof Error ? e.message : String(e)}`", "`Provider error: ${e instanceof Error ? e.message : String(e)}`"],
  ["'발송 결과 개수가 맞지 않습니다.'", "'The number of send results did not match.'"],
  ["`${failed}명 발송 실패 (${Array.from(errors).slice(0, 2).join(' / ')})`", "`${failed} failed (${Array.from(errors).slice(0, 2).join(' / ')})`"],
  ["`${deferred}명은 시간 제한으로 다음 실행에서 이어 발송`", "`${deferred} deferred to the next run (time limit)`"],
  ["' — 재시도 한도 도달'", "' — retry limit reached'"],
  ["`처리 중 오류: ${e instanceof Error ? e.message : String(e)}`", "`Processing error: ${e instanceof Error ? e.message : String(e)}`"],
])

// ---------- provider.ts ----------
rep('src/features/notifications/provider.ts', [
  ["`네트워크 오류: ${e instanceof Error ? e.message : String(e)}`", "`Network error: ${e instanceof Error ? e.message : String(e)}`"],
  ["'시간 제한으로 이번 실행에서 보내지 못했습니다 (다음 실행에서 이어 발송)'", "'Not sent in this run because of the time limit (will continue in the next run)'"],
  ["'알 수 없는 오류'", "'Unknown error'"],
])

// ---------- store.ts ----------
{
  let s = rd('src/features/notifications/store.ts')
  s = s.replace(/\n\/\/ TODO\(i18n P4\)[^\n]*\nconst EMAIL_CATEGORY_KO[^\n]*\n/, '\n')
  s = s.replace("import type { Category } from '@/features/library/params'\n", '')
  wr('src/features/notifications/store.ts', s)
}
rep('src/features/notifications/store.ts', [
  [
    "        let cohortLabel = '공용'\n        if (data.cohort_id !== null) {\n          const { data: c } = await supabase.from('cohorts').select('number').eq('id', data.cohort_id).maybeSingle()\n          cohortLabel = c ? `${c.number}기` : '공용'\n        }\n        return { kind: 'resource', id: data.id, title: data.title, cohortLabel, categoryLabel: EMAIL_CATEGORY_KO[data.category] }",
    "        // 기수 번호와 카테고리만 넘기고, \"12기 · 강의자료\" 같은 표기는 수신자 언어로 메일을 만들 때 정한다\n        let cohortNumber: number | null = null\n        if (data.cohort_id !== null) {\n          const { data: c } = await supabase.from('cohorts').select('number').eq('id', data.cohort_id).maybeSingle()\n          cohortNumber = c?.number ?? null\n        }\n        return { kind: 'resource', id: data.id, title: data.title, cohortNumber, category: data.category }",
  ],
  ['notification_jobs 조회 실패', 'notification_jobs query failed'],
  ['notification_jobs 선점 실패', 'notification_jobs claim failed'],
  ['notification_recipients 실패', 'notification_recipients failed'],
  ['notification_deliveries 기록 실패', 'notification_deliveries write failed'],
  ['notification_jobs 종료 기록 실패', 'notification_jobs finish failed'],
])
rep('src/features/notifications/unsubscribe.ts', [
  ["'UNSUBSCRIBE_HMAC_SECRET 은 16자 이상이어야 합니다.'", "'UNSUBSCRIBE_HMAC_SECRET must be at least 16 characters.'"],
])
console.log('P4 코드 변환 완료')
