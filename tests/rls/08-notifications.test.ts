// Design §2.2-③, §4.2 — 알림 처리기 + 실제 Supabase 저장소 통합 테스트 (발송기는 가짜: 메일은 한 통도 나가지 않는다)
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { processNotificationJobs, MAX_ATTEMPTS } from '@/features/notifications/process'
import type { EmailMessage, EmailProvider, SendOutcome } from '@/features/notifications/provider'
import { createSupabaseNotificationStore } from '@/features/notifications/store'
import { verifyUnsubscribeToken } from '@/features/notifications/unsubscribe'
import { FIXED, TEST_USERS, getUserIds, looseService, serviceClient } from './helpers'

const SECRET = 'integration-secret-1234567890'
const base = { siteUrl: 'https://portal.test', hmacSecret: SECRET, chunkDelayMs: 0, sleep: async () => undefined }

let ids: Awaited<ReturnType<typeof getUserIds>>
const jobIds: string[] = []
const announcementIds: string[] = []

beforeAll(async () => {
  ids = await getUserIds()
})

afterAll(async () => {
  const svc = serviceClient()
  if (jobIds.length) await svc.from('notification_jobs').delete().in('id', jobIds) // deliveries 는 cascade
  if (announcementIds.length) await svc.from('announcements').delete().in('id', announcementIds)
  await looseService().from('profiles').update({ notify_new_resource: true, notify_announcement: true }).in('id', Object.values(ids))
})

function fakeProvider(fail: (m: EmailMessage) => SendOutcome | null = () => null) {
  const sent: EmailMessage[] = []
  const provider: EmailProvider = {
    name: 'log',
    maxBatch: 100,
    sendBatch: async (msgs) =>
      msgs.map((m): SendOutcome => {
        const f = fail(m)
        if (f) return f
        sent.push(m)
        return { ok: true, id: `fake-${sent.length}` }
      }),
  }
  return { provider, sent }
}

async function newJob(kind: 'resource' | 'announcement', ref: string, extra: Record<string, unknown> = {}) {
  // DB 는 항목당 알림 작업을 1개로 제한한다 (unique(kind, ref_id) — 중복 발송 방지). 테스트마다 깨끗한 상태에서 시작한다.
  await serviceClient().from('notification_jobs').delete().eq('kind', kind).eq('ref_id', ref)
  const { data, error } = await serviceClient().from('notification_jobs').insert({ kind, ref_id: ref, ...extra }).select('id').single()
  expect(error).toBeNull()
  jobIds.push(data!.id)
  return data!.id
}

const jobRow = async (id: string) => (await serviceClient().from('notification_jobs').select('status, attempts, error').eq('id', id).single()).data!
const store = () => createSupabaseNotificationStore(serviceClient())
const emailsOf = (msgs: EmailMessage[]) => msgs.map((m) => m.to)
const testEmails = Object.values(TEST_USERS).map((u) => u.email)

describe('자료 알림', () => {
  test('열람 권한이 있고 수신에 동의한 활성 회원에게만 발송하고, 결과가 DB 에 기록된다', async () => {
    const jobId = await newJob('resource', FIXED.resource.common)
    const { provider, sent } = fakeProvider()
    const [s] = await processNotificationJobs({ store: store(), provider, jobId, ...base })

    const to = emailsOf(sent)
    expect(to).toEqual(expect.arrayContaining([TEST_USERS.admin.email, TEST_USERS.student.email, TEST_USERS.grad.email]))
    expect(to).not.toContain(TEST_USERS.pending.email) // 승인 대기는 제외
    expect(s).toMatchObject({ status: 'done', failed: 0 })
    expect(await jobRow(jobId)).toMatchObject({ status: 'done', attempts: 1 })

    const { data: del } = await serviceClient().from('notification_deliveries').select('user_id, status, provider_id').eq('job_id', jobId)
    expect(del!.every((d) => d.status === 'sent' && d.provider_id?.startsWith('fake-'))).toBe(true)
    expect(del!.map((d) => d.user_id)).toEqual(expect.arrayContaining([ids.admin, ids.student, ids.grad]))

    // 메일 내용: 자료 링크, 본인 소유 수신 해제 토큰
    const m = sent.find((x) => x.to === TEST_USERS.student.email)!
    expect(m.subject).toBe('[Kevin Community] New resource: RLS 전체 공용 자료') // 수신자 언어 기본값은 영어
    expect(m.html).toContain(`https://portal.test/library/${FIXED.resource.common}`)
    const token = m.headers!['List-Unsubscribe'].match(/t=([^>]+)>/)![1]
    expect(verifyUnsubscribeToken(SECRET, token)).toEqual({ u: ids.student, s: 'resource' })
  })

  test('같은 작업을 다시 실행해도 중복 발송하지 않는다 (done 작업은 선점되지 않는다)', async () => {
    const jobId = await newJob('resource', FIXED.resource.common)
    const first = fakeProvider()
    await processNotificationJobs({ store: store(), provider: first.provider, jobId, ...base })
    const second = fakeProvider()
    const out = await processNotificationJobs({ store: store(), provider: second.provider, jobId, ...base })
    expect(out).toEqual([])
    expect(second.sent).toHaveLength(0)
  })

  test('12기 자료는 12기·운영진에게만 (17기 재학생 제외)', async () => {
    const jobId = await newJob('resource', FIXED.resource.c12)
    const { provider, sent } = fakeProvider()
    await processNotificationJobs({ store: store(), provider, jobId, ...base })
    const to = emailsOf(sent)
    expect(to).toEqual(expect.arrayContaining([TEST_USERS.admin.email, TEST_USERS.grad.email]))
    expect(to).not.toContain(TEST_USERS.student.email)
  })

  test('수신을 끈 회원은 제외된다', async () => {
    await looseService().from('profiles').update({ notify_new_resource: false }).eq('id', ids.student)
    const jobId = await newJob('resource', FIXED.resource.common)
    const { provider, sent } = fakeProvider()
    await processNotificationJobs({ store: store(), provider, jobId, ...base })
    expect(emailsOf(sent)).not.toContain(TEST_USERS.student.email)
    expect(emailsOf(sent)).toContain(TEST_USERS.grad.email)
    await looseService().from('profiles').update({ notify_new_resource: true }).eq('id', ids.student)
  })

  test('미공개 자료의 알림은 발송하지 않고 done 으로 끝난다', async () => {
    const jobId = await newJob('resource', FIXED.resource.c12Draft)
    const { provider, sent } = fakeProvider()
    const [s] = await processNotificationJobs({ store: store(), provider, jobId, ...base })
    expect(sent).toHaveLength(0)
    expect(s).toMatchObject({ status: 'done', recipients: 0 })
    expect((await jobRow(jobId)).error).toContain('not published')
  })
})

describe('실패와 재시도', () => {
  test('한 명이 실패하면 작업은 failed, 다시 실행하면 그 사람에게만 재발송하고 done 이 된다', async () => {
    const jobId = await newJob('resource', FIXED.resource.c12)
    let failGrad = true
    const first = fakeProvider((m) => (failGrad && m.to === TEST_USERS.grad.email ? { ok: false, error: 'HTTP 500', retryable: true } : null))
    const [a] = await processNotificationJobs({ store: store(), provider: first.provider, jobId, ...base })
    expect(a.status).toBe('failed')
    expect(a.failed).toBeGreaterThanOrEqual(1)
    expect(await jobRow(jobId)).toMatchObject({ status: 'failed', attempts: 1 })

    const { data: d1 } = await serviceClient().from('notification_deliveries').select('user_id, status').eq('job_id', jobId)
    expect(d1!.find((d) => d.user_id === ids.grad)?.status).toBe('failed')
    expect(d1!.find((d) => d.user_id === ids.admin)?.status).toBe('sent')

    failGrad = false
    const second = fakeProvider()
    const [b] = await processNotificationJobs({ store: store(), provider: second.provider, jobId, ...base })
    expect(emailsOf(second.sent)).toEqual([TEST_USERS.grad.email]) // 이미 받은 admin 에게는 다시 보내지 않는다
    expect(b.status).toBe('done')
    expect(await jobRow(jobId)).toMatchObject({ status: 'done', attempts: 2 })

    const { data: d2 } = await serviceClient().from('notification_deliveries').select('user_id, status').eq('job_id', jobId)
    expect(d2!.find((d) => d.user_id === ids.grad)?.status).toBe('sent') // failed → sent 로 갱신 (행이 중복되지 않음)
    expect(d2!.filter((d) => d.user_id === ids.grad)).toHaveLength(1)
  })

  test('재시도 한도(MAX_ATTEMPTS)에 도달한 작업은 더 이상 선점되지 않는다', async () => {
    const jobId = await newJob('resource', FIXED.resource.common, { status: 'failed', attempts: MAX_ATTEMPTS })
    const { provider, sent } = fakeProvider()
    expect(await processNotificationJobs({ store: store(), provider, jobId, ...base })).toEqual([])
    expect(sent).toHaveLength(0)
  })
})

describe('동시 실행과 멈춘 작업', () => {
  test('같은 작업을 두 곳에서 동시에 처리해도 한 곳만 선점한다 (중복 발송 방지)', async () => {
    const jobId = await newJob('resource', FIXED.resource.common)
    const a = fakeProvider()
    const b = fakeProvider()
    await Promise.all([
      processNotificationJobs({ store: store(), provider: a.provider, jobId, ...base }),
      processNotificationJobs({ store: store(), provider: b.provider, jobId, ...base }),
    ])
    const totalToStudent = [...a.sent, ...b.sent].filter((m) => m.to === TEST_USERS.student.email).length
    expect(totalToStudent).toBe(1)
  })

  test('처리 중인 작업은 건드리지 않고, 10분 넘게 멈춘 작업은 회수해서 이어 처리한다', async () => {
    const fresh = await newJob('resource', FIXED.resource.common, { status: 'processing', attempts: 1, processed_at: new Date().toISOString() })
    const p1 = fakeProvider()
    expect(await processNotificationJobs({ store: store(), provider: p1.provider, jobId: fresh, ...base })).toEqual([])

    const stale = await newJob('resource', FIXED.resource.common, { status: 'processing', attempts: 1, processed_at: new Date(Date.now() - 11 * 60_000).toISOString() })
    const p2 = fakeProvider()
    const [s] = await processNotificationJobs({ store: store(), provider: p2.provider, jobId: stale, ...base })
    expect(s.status).toBe('done')
    expect(await jobRow(stale)).toMatchObject({ status: 'done', attempts: 2 })
    expect(p2.sent.length).toBeGreaterThan(0)
  })
})

describe('공지 알림', () => {
  test('공지 수신 설정을 따르고, 공지 링크와 announcement 범위 수신 해제 토큰을 쓴다', async () => {
    const { data: ann } = await serviceClient()
      .from('announcements')
      .insert({ author_id: ids.admin, title: 'RLS-notify 공지', body: '**본문** 입니다', published_at: new Date(Date.now() - 60_000).toISOString() })
      .select('id')
      .single()
    announcementIds.push(ann!.id)
    await looseService().from('profiles').update({ notify_announcement: false }).eq('id', ids.grad)

    const jobId = await newJob('announcement', ann!.id)
    const { provider, sent } = fakeProvider()
    await processNotificationJobs({ store: store(), provider, jobId, ...base })

    expect(emailsOf(sent)).not.toContain(TEST_USERS.grad.email) // 공지 알림을 끈 회원
    expect(emailsOf(sent)).toEqual(expect.arrayContaining([TEST_USERS.student.email, TEST_USERS.admin.email]))
    const m = sent.find((x) => x.to === TEST_USERS.student.email)!
    expect(m.subject).toBe('[Kevin Community] Announcement: RLS-notify 공지')
    expect(m.html).toContain(`https://portal.test/announcements/${ann!.id}`)
    expect(m.text).toContain('본문 입니다') // 마크다운 기호 제거된 요약
    expect(verifyUnsubscribeToken(SECRET, m.headers!['List-Unsubscribe'].match(/t=([^>]+)>/)![1])?.s).toBe('announcement')
    await looseService().from('profiles').update({ notify_announcement: true }).eq('id', ids.grad)
  })

  test('게시되지 않은(임시저장) 공지는 발송하지 않는다', async () => {
    const jobId = await newJob('announcement', FIXED.announcement.draft)
    const { provider, sent } = fakeProvider()
    const [s] = await processNotificationJobs({ store: store(), provider, jobId, ...base })
    expect(sent).toHaveLength(0)
    expect(s.status).toBe('done')
  })
})
