// 임시: 알림 메일 테스트를 수신자 언어(en/ko) 기준으로 갱신한다
import fs from 'node:fs'
const p = 'tests/unit/notifications.test.ts'
let s = fs.readFileSync(p, 'utf8')

const a = s.indexOf("describe('이메일 본문'")
const b = s.indexOf("describe('Resend 발송기'")
if (a < 0 || b < 0) throw new Error('markers not found')

const block = `describe('이메일 본문', () => {
  const data = { locale: 'ko' as const, name: '홍길동', title: '<script>alert(1)</script> 자료', cohortNumber: 12, category: 'lecture' as const, url: 'https://x.co/library/1', unsubscribeUrl: 'https://x.co/unsubscribe?t=abc&x=1' }
  test('HTML 은 이스케이프되고 링크·수신 해제·인사말이 들어간다 (한국어)', () => {
    const m = buildResourceEmail(data)
    expect(m.html).not.toContain('<script>')
    expect(m.html).toContain('&lt;script&gt;')
    expect(m.html).toContain('href="https://x.co/library/1"')
    expect(m.html).toContain('href="https://x.co/unsubscribe?t=abc&amp;x=1"')
    expect(m.html).toContain('홍길동 대표님, 안녕하세요.')
    expect(m.html).toContain('12기 · 강의자료')
    expect(m.text).toContain('https://x.co/library/1')
    expect(m.text).toContain('https://x.co/unsubscribe?t=abc&x=1')
    expect(m.subject).toBe('[AI4CEO] 새 자료: <script>alert(1)</script> 자료') // 제목 헤더는 텍스트라 이스케이프하지 않는다
  })
  test('같은 자료 메일을 영어로: 인사말·부제·제목·버튼·수신 해제가 영어', () => {
    const m = buildResourceEmail({ ...data, locale: 'en' })
    expect(m.subject).toBe('[AI4CEO] New resource: <script>alert(1)</script> 자료')
    expect(m.html).toContain('Hello, 홍길동.')
    expect(m.html).toContain('Cohort 12 · Lecture')
    expect(m.html).toContain('View in the portal')
    expect(m.html).toContain('click here to unsubscribe')
    expect(m.html).toContain('href="https://x.co/unsubscribe?t=abc&amp;x=1"')
    expect(m.text).toContain('View in the portal: https://x.co/library/1')
    expect(m.text).not.toMatch(/[가-힣]{2}.*안녕하세요/)
  })
  test('공용 자료의 부제 ("공용" / "Common")', () => {
    expect(buildResourceEmail({ ...data, cohortNumber: null }).html).toContain('공용 · 강의자료')
    expect(buildResourceEmail({ ...data, cohortNumber: null, locale: 'en' }).html).toContain('Common · Lecture')
  })
  test('이름이 없으면 일반 인사말', () => {
    expect(buildResourceEmail({ ...data, name: '  ' }).text).toContain('안녕하세요.')
    expect(buildResourceEmail({ ...data, name: '  ' }).text).not.toContain('대표님')
    expect(buildResourceEmail({ ...data, name: '  ', locale: 'en' }).text).toContain('Hello.')
  })
  test('제목의 줄바꿈으로 헤더를 주입할 수 없고 길이는 제한된다', () => {
    expect(cleanSubject('제목\\r\\nBcc: evil@x.com')).toBe('제목 Bcc: evil@x.com')
    expect(cleanSubject('제목\\n\\n\\t끝')).toBe('제목 끝')
    expect(cleanSubject('가'.repeat(400))).toHaveLength(150)
    expect(buildResourceEmail({ ...data, title: 'a\\r\\nBcc: x@y.z' }).subject).not.toMatch(/[\\r\\n]/)
  })
  test('공지 메일: 요약문 유무, 두 언어', () => {
    const a = buildAnnouncementEmail({ locale: 'ko', name: '김', title: '공지', excerpt: '요약 <b>', url: 'https://x.co/announcements/1', unsubscribeUrl: 'https://x.co/u' })
    expect(a.subject).toBe('[AI4CEO] 공지: 공지')
    expect(a.html).toContain('요약 &lt;b&gt;')
    const en = buildAnnouncementEmail({ locale: 'en', name: '김', title: 'News', excerpt: 'x', url: 'https://x.co/announcements/1', unsubscribeUrl: 'https://x.co/u' })
    expect(en.subject).toBe('[AI4CEO] Announcement: News')
    expect(en.html).toContain('Read the announcement')
    expect(buildAnnouncementEmail({ locale: 'ko', name: '김', title: '공지', excerpt: '', url: 'u', unsubscribeUrl: 'v' }).html).not.toContain('color:#374151')
  })
  test('escapeHtml', () => {
    expect(escapeHtml(\`<a href="x" onclick='y'>&</a>\`)).toBe('&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
  })
  test('localeOf: 모르는 값은 기본 언어(영어)', () => {
    expect(localeOf('ko')).toBe('ko')
    expect(localeOf('en')).toBe('en')
    expect(localeOf('fr')).toBe('en')
    expect(localeOf(null)).toBe('en')
    expect(localeOf(undefined)).toBe('en')
  })
})

`
s = s.slice(0, a) + block + s.slice(b)

const rep = (x, y) => {
  if (!s.includes(x)) throw new Error('missing: ' + x.slice(0, 60))
  s = s.split(x).join(y)
}
rep("import { buildAnnouncementEmail, buildResourceEmail, cleanSubject, escapeHtml } from '@/features/notifications/templates'", "import { localeOf } from '@/features/notifications/emailCopy'\nimport { buildAnnouncementEmail, buildResourceEmail, cleanSubject, escapeHtml } from '@/features/notifications/templates'")
rep("{ kind: 'resource', id: 'res-1', title: '자료', cohortLabel: '12기', categoryLabel: '강의자료' }", "{ kind: 'resource', id: 'res-1', title: '자료', cohortNumber: 12, category: 'lecture' }")
// 큐 처리 테스트: 수신자 언어가 없으면 영어 → 제목은 영어. 한국어 수신자는 한국어.
rep("expect(m.subject).toBe('[AI4CEO] 새 자료: 자료')", "expect(m.subject).toBe('[AI4CEO] New resource: 자료') // 수신자 언어가 없으면 기본 언어(영어)")
fs.writeFileSync(p, s)
console.log('ok')
