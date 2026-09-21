import { createHmac } from 'node:crypto'
import { describe, expect, test, vi } from 'vitest'
import { loadNotificationConfig } from '@/features/notifications/config'
import {
  MAX_ATTEMPTS,
  processNotificationJobs,
  type DeliveryRow,
  type JobRecord,
  type NotificationStore,
  type Recipient,
  type Subject,
} from '@/features/notifications/process'
import { createLogProvider, createResendProvider, type EmailMessage, type EmailProvider, type SendOutcome } from '@/features/notifications/provider'
import { isClaimable } from '@/features/notifications/store'
import { localeOf } from '@/features/notifications/emailCopy'
import { buildAnnouncementEmail, buildResourceEmail, cleanSubject, escapeHtml } from '@/features/notifications/templates'
import { signUnsubscribeToken, unsubscribePatch, verifyUnsubscribeToken } from '@/features/notifications/unsubscribe'

const SECRET = 'test-secret-1234567890abcdef'
const UID = '48962005-cff9-4f85-b2bb-127c29ec4b5d'

describe('수신 해제 토큰', () => {
  test('서명 → 검증 왕복', () => {
    const t = signUnsubscribeToken(SECRET, { u: UID, s: 'resource' })
    expect(verifyUnsubscribeToken(SECRET, t)).toEqual({ u: UID, s: 'resource' })
    expect(verifyUnsubscribeToken(SECRET, signUnsubscribeToken(SECRET, { u: UID, s: 'all' }))?.s).toBe('all')
  })
  test('본문·서명 위변조, 다른 비밀키, 잘못된 형식은 거부', () => {
    const t = signUnsubscribeToken(SECRET, { u: UID, s: 'resource' })
    const [body, sig] = t.split('.')
    const forgedBody = Buffer.from(JSON.stringify({ u: UID, s: 'all' })).toString('base64url')
    expect(verifyUnsubscribeToken(SECRET, `${forgedBody}.${sig}`)).toBeNull()
    expect(verifyUnsubscribeToken(SECRET, `${body}.${sig.slice(0, -2)}AA`)).toBeNull()
    expect(verifyUnsubscribeToken('another-secret-1234567890', t)).toBeNull()
    for (const bad of ['', 'abc', 'a.b.c', `${body}.`, '.', 'x'.repeat(600), null, undefined]) {
      expect(verifyUnsubscribeToken(SECRET, bad as string)).toBeNull()
    }
  })
  test('서명이 맞아도 payload 형식이 틀리면 거부 (uuid 아님, 알 수 없는 범위)', () => {
    const craft = (payload: object) => {
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
      return `${body}.${createHmac('sha256', SECRET).update(body).digest().toString('base64url')}`
    }
    expect(verifyUnsubscribeToken(SECRET, craft({ u: 'not-a-uuid', s: 'all' }))).toBeNull()
    expect(verifyUnsubscribeToken(SECRET, craft({ u: UID, s: 'admin' }))).toBeNull()
    expect(verifyUnsubscribeToken(SECRET, craft({ u: UID }))).toBeNull()
    expect(verifyUnsubscribeToken(SECRET, craft({ u: UID, s: 'all' }))).toEqual({ u: UID, s: 'all' })
  })
  test('짧은 비밀키는 서명·검증 모두 거부', () => {
    expect(() => signUnsubscribeToken('short', { u: UID, s: 'all' })).toThrow()
    expect(verifyUnsubscribeToken('short', 'a.b')).toBeNull()
  })
  test('범위별 변경값', () => {
    expect(unsubscribePatch('resource')).toEqual({ notify_new_resource: false })
    expect(unsubscribePatch('announcement')).toEqual({ notify_announcement: false })
    expect(unsubscribePatch('all')).toEqual({ notify_new_resource: false, notify_announcement: false })
  })
})

describe('이메일 본문', () => {
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
    expect(cleanSubject('제목\r\nBcc: evil@x.com')).toBe('제목 Bcc: evil@x.com')
    expect(cleanSubject('제목\n\n\t끝')).toBe('제목 끝')
    expect(cleanSubject('가'.repeat(400))).toHaveLength(150)
    expect(buildResourceEmail({ ...data, title: 'a\r\nBcc: x@y.z' }).subject).not.toMatch(/[\r\n]/)
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
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
  })
  test('localeOf: 모르는 값은 기본 언어(영어)', () => {
    expect(localeOf('ko')).toBe('ko')
    expect(localeOf('en')).toBe('en')
    expect(localeOf('fr')).toBe('en')
    expect(localeOf(null)).toBe('en')
    expect(localeOf(undefined)).toBe('en')
  })
})

describe('Resend 발송기', () => {
  const msg = (i: number): EmailMessage => ({ to: `u${i}@example.com`, subject: `s${i}`, html: '<p>h</p>', text: 't', headers: { 'List-Unsubscribe': '<https://x>' }, idempotencyKey: `job:${i}` })
  const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  const make = (impl: (url: string, init: RequestInit) => Promise<Response>) => {
    const sleep = vi.fn(async () => undefined)
    const fetchImpl = vi.fn(impl as never) as unknown as typeof fetch
    return { provider: createResendProvider({ apiKey: 'key', from: 'AI4CEO <a@b.com>', fetchImpl, sleep }), sleep, fetchImpl }
  }

  test('배치 성공: id 가 순서대로 매핑되고 인증·발신자·헤더가 전달된다', async () => {
    const { provider, fetchImpl } = make(async () => res(200, { data: [{ id: 'r1' }, { id: 'r2' }] }))
    const out = await provider.sendBatch([msg(1), msg(2)])
    expect(out).toEqual([{ ok: true, id: 'r1' }, { ok: true, id: 'r2' }])
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails/batch')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer key')
    const body = JSON.parse(init.body as string)
    expect(body[0]).toMatchObject({ from: 'AI4CEO <a@b.com>', to: ['u1@example.com'], subject: 's1', headers: { 'List-Unsubscribe': '<https://x>' } })
  })
  test('빈 입력은 호출하지 않는다', async () => {
    const { provider, fetchImpl } = make(async () => res(200, {}))
    expect(await provider.sendBatch([])).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  // 배치 요청 본문의 수신자 목록 / 어느 주소가 잘못됐는지 흉내내는 가짜 Resend
  const recipientsOf = (init: RequestInit) => {
    const b = JSON.parse(init.body as string)
    return (Array.isArray(b) ? b.map((x: { to: string[] }) => x.to[0]) : [b.to[0]]) as string[]
  }
  const badResend = (bad: Set<string>) => async (url: string, init: RequestInit) => {
    const to = recipientsOf(init)
    if (to.some((t) => bad.has(t))) return res(422, { message: 'Invalid `to` field' })
    return url.endsWith('/emails/batch') ? res(200, { data: to.map((t) => ({ id: `id-${t}` })) }) : res(200, { id: `id-${to[0]}` })
  }

  test('배치가 검증 오류(422)로 거절되면 반씩 나누어 다시 보내 문제 주소 하나만 골라낸다', async () => {
    const { provider } = make(badResend(new Set(['u2@example.com'])))
    const out = await provider.sendBatch([msg(1), msg(2), msg(3)])
    expect(out[0]).toEqual({ ok: true, id: 'id-u1@example.com' })
    expect(out[1]).toMatchObject({ ok: false, retryable: false })
    expect((out[1] as { error: string }).error).toContain('HTTP 422')
    expect(out[2]).toEqual({ ok: true, id: 'id-u3@example.com' })
  })
  test('100통 중 1통이 잘못돼도 요청은 20번 이하(하나씩 100번이 아님)이고 나머지 99통은 모두 성공', async () => {
    const { provider, fetchImpl } = make(badResend(new Set(['u57@example.com'])))
    const out = await provider.sendBatch(Array.from({ length: 100 }, (_, i) => msg(i)))
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(20)
    expect(out.filter((o) => o.ok)).toHaveLength(99)
    expect(out[57]).toMatchObject({ ok: false, retryable: false })
    expect(out.every((o, i) => i === 57 || (o.ok && o.id === `id-u${i}@example.com`))).toBe(true) // 순서 유지
  })
  test('여러 주소가 잘못돼도 각각만 실패하고 결과 순서가 유지된다', async () => {
    const bad = new Set(['u0@example.com', 'u9@example.com', 'u10@example.com'])
    const { provider } = make(badResend(bad))
    const out = await provider.sendBatch(Array.from({ length: 12 }, (_, i) => msg(i)))
    expect(out.map((o) => o.ok)).toEqual(Array.from({ length: 12 }, (_, i) => !bad.has(`u${i}@example.com`)))
  })
  test('시간 제한(deadlineAt)이 지나면 새 요청을 보내지 않고 나머지를 재시도 가능 실패로 돌려준다', async () => {
    const { provider, fetchImpl } = make(badResend(new Set(['u1@example.com'])))
    const out = await provider.sendBatch([msg(1), msg(2), msg(3), msg(4)], { deadlineAt: Date.now() - 1 })
    // 첫 배치는 이미 보냈고(거절됨), 그 뒤 격리 단계의 새 요청은 모두 보류된다
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
    expect(out).toHaveLength(4)
    expect(out.every((o) => !o.ok && o.retryable)).toBe(true)
    expect((out[0] as { error: string }).error).toContain('time limit')
  })
  test('건별 발송에는 Idempotency-Key 가 붙는다', async () => {
    const seen: string[] = []
    const { provider } = make(async (url, init) => {
      if (url.endsWith('/batch')) return res(400, {})
      seen.push((init.headers as Record<string, string>)['Idempotency-Key'])
      return res(200, { id: 'x' })
    })
    await provider.sendBatch([msg(1), msg(2)])
    expect(seen).toEqual(['job:1', 'job:2'])
  })
  test('서버 오류(500)는 점점 길게 기다리며 3번 재시도하고, 끝내 실패하면 전원 재시도 가능 실패', async () => {
    const { provider, sleep, fetchImpl } = make(async () => res(500, { message: 'boom' }))
    const out = await provider.sendBatch([msg(1), msg(2)])
    expect(out.every((o) => !o.ok && o.retryable)).toBe(true)
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(3)
    expect((sleep as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual([500, 1000, 2000])
  })
  test('429 후 재시도해서 성공하면 정상 처리', async () => {
    let n = 0
    const { provider } = make(async () => (++n === 1 ? res(429, { message: 'rate' }) : res(200, { data: [{ id: 'ok' }] })))
    expect(await provider.sendBatch([msg(1)])).toEqual([{ ok: true, id: 'ok' }])
  })
  test('네트워크 오류는 재시도 가능한 실패', async () => {
    const { provider } = make(async () => {
      throw new Error('ECONNRESET')
    })
    const out = await provider.sendBatch([msg(1)])
    expect(out[0]).toMatchObject({ ok: false, retryable: true })
    expect((out[0] as { error: string }).error).toContain('ECONNRESET')
  })
  test('응답 개수가 요청과 다르면 건별로 다시 확인한다', async () => {
    const { provider } = make(async (url) => (url.endsWith('/batch') ? res(200, { data: [{ id: 'only-one' }] }) : res(200, { id: 'single' })))
    const out = await provider.sendBatch([msg(1), msg(2)])
    expect(out).toEqual([{ ok: true, id: 'single' }, { ok: true, id: 'single' }])
  })
  test('로그 발송기는 보내지 않고 기록만 한다', async () => {
    const lines: string[] = []
    const out = await createLogProvider((l) => lines.push(l)).sendBatch([msg(1), msg(2)])
    expect(out).toEqual([{ ok: true, id: 'log-1' }, { ok: true, id: 'log-2' }])
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('u1@example.com')
  })
})

describe('loadNotificationConfig', () => {
  const base = { NEXT_PUBLIC_SITE_URL: 'https://portal.example.com/', UNSUBSCRIBE_HMAC_SECRET: SECRET, RESEND_API_KEY: 're_x', EMAIL_FROM: 'AI4CEO <a@b.com>' }
  test('필요한 값이 모두 있으면 Resend 설정, 주소 끝의 / 는 제거', () => {
    const c = loadNotificationConfig(base)
    expect(c?.provider.name).toBe('resend')
    expect(c?.siteUrl).toBe('https://portal.example.com')
  })
  test.each([
    [{ ...base, NEXT_PUBLIC_SITE_URL: '' }, '사이트 주소 없음'],
    [{ ...base, NEXT_PUBLIC_SITE_URL: 'portal.example.com' }, 'http(s) 아님'],
    [{ ...base, UNSUBSCRIBE_HMAC_SECRET: 'short' }, '비밀키 짧음'],
    [{ ...base, RESEND_API_KEY: '' }, 'API 키 없음'],
    [{ ...base, EMAIL_FROM: '' }, '발신자 없음'],
    [{ ...base, NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'http://portal.example.com' }, '운영은 https 필수'],
  ] as [Record<string, string>, string][])('미설정: %#', (env) => {
    expect(loadNotificationConfig(env)).toBeNull()
  })
  test('로그 발송기는 개발에서만 (운영에서는 무시되어 미설정)', () => {
    const dev = { NEXT_PUBLIC_SITE_URL: 'http://localhost:3000', UNSUBSCRIBE_HMAC_SECRET: SECRET, EMAIL_PROVIDER: 'log' }
    expect(loadNotificationConfig(dev)?.provider.name).toBe('log')
    expect(loadNotificationConfig({ ...dev, NODE_ENV: 'production' })).toBeNull()
  })
})

describe('isClaimable', () => {
  const now = Date.now()
  test.each([
    [{ status: 'queued', attempts: 0, processed_at: null }, true],
    [{ status: 'failed', attempts: MAX_ATTEMPTS - 1, processed_at: null }, true],
    [{ status: 'failed', attempts: MAX_ATTEMPTS, processed_at: null }, false],
    [{ status: 'done', attempts: 1, processed_at: null }, false],
    [{ status: 'processing', attempts: 1, processed_at: new Date(now - 60_000).toISOString() }, false],
    [{ status: 'processing', attempts: 1, processed_at: new Date(now - 11 * 60_000).toISOString() }, true],
    [{ status: 'processing', attempts: MAX_ATTEMPTS, processed_at: new Date(now - 11 * 60_000).toISOString() }, false],
    [{ status: 'processing', attempts: 1, processed_at: null }, false],
  ] as const)('%j → %s', (row, expected) => {
    expect(isClaimable(row, now)).toBe(expected)
  })
})

// ---- 큐 처리기 (가짜 저장소 + 가짜 발송기) ----
function fakeStore(over: { subject?: Subject | null; recipients?: Recipient[]; job?: Partial<JobRecord> } = {}) {
  const job: JobRecord = { id: 'job-1', kind: 'resource', ref_id: 'res-1', attempts: 1, ...over.job }
  const allRecipients = over.recipients ?? []
  const sent = new Set<string>()
  const deliveries: DeliveryRow[] = []
  const finished: { status: string; error?: string | null }[] = []
  const store: NotificationStore = {
    claimJobs: async () => [job],
    loadSubject: async () => (over.subject === undefined ? { kind: 'resource', id: 'res-1', title: '자료', cohortNumber: 12, category: 'lecture' } : over.subject),
    recipients: async () => allRecipients.filter((r) => !sent.has(r.user_id)), // 이미 발송한 사람은 제외 (실제 RPC 와 같은 규칙)
    recordDeliveries: async (_id, rows) => {
      deliveries.push(...rows)
      rows.filter((r) => r.status === 'sent').forEach((r) => sent.add(r.user_id))
    },
    finishJob: async (_id, r) => void finished.push(r),
  }
  return { store, deliveries, finished, sent }
}
// 실제 사용자 id 는 UUID 이고 수신 해제 토큰이 이를 검증하므로 테스트 데이터도 UUID 로 만든다
const uid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const people = (n: number): Recipient[] => Array.from({ length: n }, (_, i) => ({ user_id: uid(i), email: `u${i}@example.com`, name: `이름${i}` }))
const okProvider = (maxBatch = 100): EmailProvider & { calls: EmailMessage[][] } => {
  const calls: EmailMessage[][] = []
  return { name: 'log', maxBatch, calls, sendBatch: async (ms) => (calls.push(ms), ms.map((_, i) => ({ ok: true as const, id: `id-${calls.length}-${i}` }))) }
}
const opts = { siteUrl: 'https://portal.example.com', hmacSecret: SECRET, chunkDelayMs: 0, sleep: async () => undefined }

describe('processNotificationJobs', () => {
  test('수신자 전원에게 발송하고 결과를 기록한 뒤 작업을 done 으로 마친다', async () => {
    const { store, deliveries, finished } = fakeStore({ recipients: people(3) })
    const provider = okProvider()
    const [s] = await processNotificationJobs({ store, provider, ...opts })
    expect(s).toMatchObject({ jobId: 'job-1', recipients: 3, sent: 3, failed: 0, status: 'done' })
    expect(deliveries.map((d) => d.status)).toEqual(['sent', 'sent', 'sent'])
    expect(finished).toEqual([{ status: 'done', error: null }])

    const m = provider.calls[0][0]
    expect(m.to).toBe('u0@example.com')
    expect(m.subject).toBe('[AI4CEO] New resource: 자료') // 수신자 언어가 없으면 기본 언어(영어)
    expect(m.html).toContain('https://portal.example.com/library/res-1')
    expect(m.idempotencyKey).toBe(`job-1:${uid(0)}`)
    const unsub = m.headers?.['List-Unsubscribe'] ?? ''
    expect(unsub).toMatch(/^<https:\/\/portal\.example\.com\/api\/unsubscribe\?t=.+>$/)
    expect(m.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    // 수신 해제 토큰은 그 수신자 본인 것이다
    const token = unsub.match(/t=([^>]+)>/)![1]
    expect(verifyUnsubscribeToken(SECRET, token)).toEqual({ u: uid(0), s: 'resource' })
  })

  test('공지 알림은 공지 링크와 announcement 범위 토큰을 쓴다', async () => {
    const { store } = fakeStore({ job: { kind: 'announcement', ref_id: 'ann-1' }, subject: { kind: 'announcement', id: 'ann-1', title: '공지', excerpt: '요약' }, recipients: people(1) })
    const provider = okProvider()
    await processNotificationJobs({ store, provider, ...opts })
    expect(provider.calls[0][0].html).toContain('https://portal.example.com/announcements/ann-1')
    expect(verifyUnsubscribeToken(SECRET, provider.calls[0][0].headers!['List-Unsubscribe'].match(/t=([^>]+)>/)![1])?.s).toBe('announcement')
  })

  test('발송기의 최대 배치 크기로 나누어 보내고 배치 사이에 대기한다', async () => {
    const { store } = fakeStore({ recipients: people(250) })
    const provider = okProvider(100)
    const sleep = vi.fn(async () => undefined)
    const [s] = await processNotificationJobs({ store, provider, ...opts, chunkDelayMs: 600, sleep })
    expect(provider.calls.map((c) => c.length)).toEqual([100, 100, 50])
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(600)
    expect(s.sent).toBe(250)
  })

  test('일부 실패하면 failed 로 남고, 다시 실행하면 실패한 사람에게만 재발송한다 (중복 발송 없음)', async () => {
    const { store, deliveries, finished, sent } = fakeStore({ recipients: people(3) })
    let failUser1 = true
    const provider: EmailProvider = {
      name: 'log', maxBatch: 100,
      sendBatch: async (ms) => ms.map((m): SendOutcome => (m.to === 'u1@example.com' && failUser1 ? { ok: false, error: 'HTTP 500', retryable: true } : { ok: true, id: 'x' })),
    }
    const first = (await processNotificationJobs({ store, provider, ...opts }))[0]
    expect(first).toMatchObject({ recipients: 3, sent: 2, failed: 1, status: 'failed' })
    expect(first.note).toContain('1 failed')
    expect(finished[0].status).toBe('failed')
    expect(Array.from(sent).sort()).toEqual([uid(0), uid(2)])

    failUser1 = false
    const second = (await processNotificationJobs({ store, provider, ...opts }))[0]
    expect(second).toMatchObject({ recipients: 1, sent: 1, failed: 0, status: 'done' }) // 1번 사용자만
    expect(deliveries.filter((d) => d.user_id === uid(0) && d.status === 'sent')).toHaveLength(1)
  })

  test('재시도 한도에 도달한 실패는 그 사실을 기록한다', async () => {
    const { store, finished } = fakeStore({ recipients: people(1), job: { attempts: MAX_ATTEMPTS } })
    const provider: EmailProvider = { name: 'log', maxBatch: 100, sendBatch: async (ms) => ms.map(() => ({ ok: false as const, error: 'HTTP 422', retryable: false })) }
    const [s] = await processNotificationJobs({ store, provider, ...opts })
    expect(s.status).toBe('failed')
    expect(finished[0].error).toContain('retry limit reached')
  })

  test('대상이 사라졌거나 공개되지 않았으면 발송하지 않고 done 으로 끝낸다', async () => {
    const { store, finished } = fakeStore({ subject: null, recipients: people(5) })
    const provider = okProvider()
    const [s] = await processNotificationJobs({ store, provider, ...opts })
    expect(provider.calls).toHaveLength(0)
    expect(s).toMatchObject({ recipients: 0, sent: 0, status: 'done' })
    expect(finished[0].status).toBe('done')
  })

  test('수신자가 없으면 done', async () => {
    const { store } = fakeStore({ recipients: [] })
    const provider = okProvider()
    const [s] = await processNotificationJobs({ store, provider, ...opts })
    expect(provider.calls).toHaveLength(0)
    expect(s).toMatchObject({ recipients: 0, status: 'done' })
  })

  test('발송기가 예외를 던지거나 결과 개수가 다르면 전원 실패로 기록하고 죽지 않는다', async () => {
    for (const bad of [
      { name: 'log' as const, maxBatch: 100, sendBatch: async () => { throw new Error('boom') } },
      { name: 'log' as const, maxBatch: 100, sendBatch: async () => [] },
    ]) {
      const { store, deliveries } = fakeStore({ recipients: people(2) })
      const [s] = await processNotificationJobs({ store, provider: bad, ...opts })
      expect(s).toMatchObject({ sent: 0, failed: 2, status: 'failed' })
      expect(deliveries.every((d) => d.status === 'failed')).toBe(true)
    }
  })

  test('시간 제한이 지나면 새 묶음을 시작하지 않고 남은 사람은 기록 없이 미루며, 다음 실행에서 그 사람들에게만 보낸다', async () => {
    const { store, deliveries, finished, sent } = fakeStore({ recipients: people(5) })
    const provider = okProvider(2) // 묶음 3개: 2 + 2 + 1
    let now = 1_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    const wrapped: EmailProvider = { ...provider, sendBatch: async (ms, o) => { const r = await provider.sendBatch(ms, o); now += 60_000; return r } } // 첫 묶음을 보내면 시간 초과
    const first = await processNotificationJobs({ store, provider: wrapped, ...opts, deadlineAt: 30_000 })
    spy.mockRestore()
    expect(first[0]).toMatchObject({ sent: 2, failed: 0, status: 'failed' })
    expect(first[0].note).toContain('3 deferred')
    expect(deliveries).toHaveLength(2) // 미룬 사람은 기록하지 않는다
    expect(finished[0].status).toBe('failed')

    const second = await processNotificationJobs({ store, provider, ...opts })
    expect(second[0]).toMatchObject({ recipients: 3, sent: 3, status: 'done' })
    expect(sent.size).toBe(5)
    const all = provider.calls.flat().map((m) => m.to)
    expect(new Set(all).size).toBe(all.length) // 어느 주소에도 두 번 보내지 않았다
  })
  test('저장소 오류는 작업을 failed 로 표시하고 다른 작업 처리를 막지 않는다', async () => {
    const good = fakeStore({ recipients: people(1), job: { id: 'good' } })
    const bad = fakeStore({ recipients: people(1), job: { id: 'bad' } })
    bad.store.recipients = async () => {
      throw new Error('db down')
    }
    const store: NotificationStore = { ...good.store, claimJobs: async () => [{ id: 'bad', kind: 'resource', ref_id: 'r', attempts: 1 }, { id: 'good', kind: 'resource', ref_id: 'r', attempts: 1 }], recipients: async (job) => (job.id === 'bad' ? bad.store.recipients(job) : good.store.recipients(job)) }
    const out = await processNotificationJobs({ store, provider: okProvider(), ...opts })
    expect(out.map((s) => [s.jobId, s.status])).toEqual([['bad', 'failed'], ['good', 'done']])
    expect(out[0].note).toContain('db down')
  })
})
