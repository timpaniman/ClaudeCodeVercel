// Design §8.2 — L0: 디렉토리·다운로드 기록·활동 로그·공개/알림 RPC, service role 전용 테이블
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  FIXED,
  cohortIdByNumber,
  getUserIds,
  looseService,
  serviceClient,
  TEST_USERS,
  type LooseClient,
} from './helpers'
import { signedInClient } from './session'

let ids: Awaited<ReturnType<typeof getUserIds>>
let c12: number

beforeAll(async () => {
  ids = await getUserIds()
  c12 = await cohortIdByNumber(12)
})

afterAll(async () => {
  const svc = serviceClient()
  await svc.from('resources').update({ is_published: false, published_at: null }).eq('id', FIXED.resource.c12Draft)
  await svc.from('notification_jobs').delete().in('ref_id', [...Object.values(FIXED.resource), ...Object.values(FIXED.announcement)])
  await looseService().from('profiles').update({ notify_new_resource: true }).in('id', Object.values(ids))
})

describe('directory_members', () => {
  test('#10 회원에게는 활성 회원의 공개 컬럼만 반환한다 — email 이 없다', async () => {
    const student = await signedInClient('student')
    const { data, error } = await student.rpc('directory_members', {})
    expect(error).toBeNull()
    const rows = data ?? []
    expect(rows.length).toBeGreaterThanOrEqual(3)
    for (const row of rows) expect(Object.keys(row)).not.toContain('email')
    const got = rows.map((r) => r.id)
    expect(got).toEqual(expect.arrayContaining([ids.admin, ids.student, ids.grad]))
    expect(got).not.toContain(ids.pending) // pending 은 디렉토리에 나오지 않는다
  })

  test('기수로 필터링할 수 있다', async () => {
    const student = await signedInClient('student')
    const { data } = await student.rpc('directory_members', { p_cohort_id: c12 })
    const got = (data ?? []).map((r) => r.id)
    expect(got).toContain(ids.grad)
    expect(got).not.toContain(ids.student)
  })

  test('승인 대기 회원은 빈 결과를 받는다', async () => {
    const pending = await signedInClient('pending')
    const { data, error } = await pending.rpc('directory_members', {})
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })
})

describe('record_download / log_activity', () => {
  test('열람 권한이 있으면 다운로드 수가 +1 되고 로그가 남는다 (updated_at 은 그대로)', async () => {
    const svc = serviceClient()
    const before = await svc.from('resources').select('download_count, updated_at').eq('id', FIXED.resource.c17).single()
    const student = await signedInClient('student')
    const { error } = await student.rpc('record_download', { p_resource: FIXED.resource.c17, p_device: 'mobile' })
    expect(error).toBeNull()

    const after = await svc.from('resources').select('download_count, updated_at').eq('id', FIXED.resource.c17).single()
    expect(after.data?.download_count).toBe((before.data?.download_count ?? 0) + 1)
    expect(after.data?.updated_at).toBe(before.data?.updated_at)

    const { data: log } = await looseService()
      .from('activity_log')
      .select('event, device')
      .eq('user_id', ids.student)
      .eq('ref_id', FIXED.resource.c17)
      .eq('event', 'download_resource')
    expect(log).toHaveLength(1)
    expect(log?.[0].device).toBe('mobile')
  })

  test('권한 없는 자료(타 기수)는 not found, 승인 대기는 forbidden, 카운트는 그대로', async () => {
    const svc = serviceClient()
    const before = await svc.from('resources').select('download_count').eq('id', FIXED.resource.c12).single()

    const student = await signedInClient('student')
    const r1 = await student.rpc('record_download', { p_resource: FIXED.resource.c12 })
    expect(r1.error?.message).toMatch(/not found/)

    const pending = await signedInClient('pending')
    const r2 = await pending.rpc('record_download', { p_resource: FIXED.resource.c17 })
    expect(r2.error?.code).toBe('42501')

    const draft = await (await signedInClient('grad')).rpc('record_download', { p_resource: FIXED.resource.c12Draft })
    expect(draft.error?.message).toMatch(/not found/) // 미공개

    const after = await svc.from('resources').select('download_count').eq('id', FIXED.resource.c12).single()
    expect(after.data?.download_count).toBe(before.data?.download_count)
  })

  test("'visit' 은 하루 1회만 기록하고, 다운로드 이벤트는 log_activity 로 기록할 수 없다", async () => {
    const student = await signedInClient('student')
    await student.rpc('log_activity', { p_event: 'visit', p_device: 'desktop' })
    await student.rpc('log_activity', { p_event: 'visit', p_device: 'desktop' })
    const { data } = await looseService().from('activity_log').select('id').eq('user_id', ids.student).eq('event', 'visit')
    expect(data).toHaveLength(1)

    const bad = await student.rpc('log_activity', { p_event: 'download_resource' })
    expect(bad.error?.code).toBe('22023')

    // activity_log 에 직접 INSERT 는 불가
    const direct = await (student as unknown as LooseClient)
      .from('activity_log')
      .insert({ user_id: ids.student, event: 'visit' })
    expect(direct.error).not.toBeNull()
  })
})

describe('notification_recipients (service role 전용)', () => {
  const emailsFor = async (ref: string) => {
    const { data, error } = await serviceClient().rpc('notification_recipients', { p_kind: 'resource', p_ref: ref })
    expect(error).toBeNull()
    return (data ?? []).map((r) => r.email)
  }

  test('공용 자료는 전 활성 회원, 12기 자료는 12기·운영진에게만 (17기 재학생 제외)', async () => {
    const common = await emailsFor(FIXED.resource.common)
    expect(common).toEqual(expect.arrayContaining([TEST_USERS.admin.email, TEST_USERS.student.email, TEST_USERS.grad.email]))
    expect(common).not.toContain(TEST_USERS.pending.email)

    const c12Emails = await emailsFor(FIXED.resource.c12)
    expect(c12Emails).toEqual(expect.arrayContaining([TEST_USERS.admin.email, TEST_USERS.grad.email]))
    expect(c12Emails).not.toContain(TEST_USERS.student.email)
  })

  test('수신 거부한 회원과 미공개 자료는 제외된다', async () => {
    await looseService().from('profiles').update({ notify_new_resource: false }).eq('id', ids.student)
    expect(await emailsFor(FIXED.resource.common)).not.toContain(TEST_USERS.student.email)
    await looseService().from('profiles').update({ notify_new_resource: true }).eq('id', ids.student)

    expect(await emailsFor(FIXED.resource.c12Draft)).toEqual([])
  })

  test('이미 발송된 회원은 다음 계산에서 빠진다 (재시도 멱등)', async () => {
    const svc = serviceClient()
    const { data: job } = await svc.from('notification_jobs').insert({ kind: 'resource', ref_id: FIXED.resource.common }).select('id').single()
    await svc.from('notification_deliveries').insert({ job_id: job!.id, user_id: ids.grad, status: 'sent' })
    expect(await emailsFor(FIXED.resource.common)).not.toContain(TEST_USERS.grad.email)
    await svc.from('notification_jobs').delete().eq('id', job!.id)
  })

  test('#12 일반 회원은 알림 테이블·수신자 RPC 에 접근할 수 없다', async () => {
    const student = (await signedInClient('student')) as unknown as LooseClient
    for (const table of ['notification_jobs', 'notification_deliveries']) {
      const { error } = await student.from(table).select('*').limit(1)
      expect(error?.code).toBe('42501')
    }
    const rpc = await student.rpc('notification_recipients', { p_kind: 'resource', p_ref: FIXED.resource.common })
    expect(rpc.error).not.toBeNull()
  })
})

describe('publish_resource / admin_stats', () => {
  test('운영진이 공개하면 알림 job 이 한 번만 적재된다', async () => {
    const admin = await signedInClient('admin')
    const first = await admin.rpc('publish_resource', { p_id: FIXED.resource.c12Draft, p_notify: true })
    expect(first.error).toBeNull()
    expect(typeof first.data).toBe('string')

    const svc = serviceClient()
    const { data: res } = await svc.from('resources').select('is_published, published_at').eq('id', FIXED.resource.c12Draft).single()
    expect(res?.is_published).toBe(true)
    expect(res?.published_at).not.toBeNull()

    const second = await admin.rpc('publish_resource', { p_id: FIXED.resource.c12Draft, p_notify: true })
    expect(second.error).toBeNull()
    expect(second.data).toBeNull() // 이미 job 이 있어 중복 적재하지 않음

    const { data: jobs } = await svc.from('notification_jobs').select('id').eq('ref_id', FIXED.resource.c12Draft)
    expect(jobs).toHaveLength(1)
  })

  test('일괄 공개(p_notify=false)는 job 을 만들지 않는다', async () => {
    const svc = serviceClient()
    await svc.from('resources').update({ is_published: false, published_at: null }).eq('id', FIXED.resource.c12Draft)
    await svc.from('notification_jobs').delete().eq('ref_id', FIXED.resource.c12Draft)

    const admin = await signedInClient('admin')
    const r = await admin.rpc('publish_resource', { p_id: FIXED.resource.c12Draft, p_notify: false })
    expect(r.error).toBeNull()
    expect(r.data).toBeNull()
    const { data: jobs } = await svc.from('notification_jobs').select('id').eq('ref_id', FIXED.resource.c12Draft)
    expect(jobs ?? []).toHaveLength(0)
  })

  test('일반 회원은 공개할 수 없다', async () => {
    const student = await signedInClient('student')
    const { error } = await student.rpc('publish_resource', { p_id: FIXED.resource.c12Draft })
    expect(error?.code).toBe('42501')
  })

  test('admin_stats 는 운영진만 호출할 수 있고 필요한 키를 반환한다', async () => {
    const admin = await signedInClient('admin')
    const { data, error } = await admin.rpc('admin_stats', {})
    expect(error).toBeNull()
    expect(Object.keys(data as object)).toEqual(
      expect.arrayContaining(['members_active', 'members_pending', 'signup_rate', 'mau', 'mau_by_cohort', 'weekly_visits', 'device_ratio', 'top_resources']),
    )
    expect((data as Record<string, number>).members_active).toBeGreaterThanOrEqual(3)

    const student = await signedInClient('student')
    expect((await student.rpc('admin_stats', {})).error?.code).toBe('42501')
  })
})
