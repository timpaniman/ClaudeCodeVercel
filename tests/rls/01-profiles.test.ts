// Design §8.2 — L0 RLS: profiles (권한 상승·컬럼 보호), anon 차단
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { anonClient, getUserIds, looseService, type LooseClient } from './helpers'
import { signedInClient } from './session'

const PERMISSION_DENIED = '42501'
let ids: Awaited<ReturnType<typeof getUserIds>>

beforeAll(async () => {
  ids = await getUserIds()
})

afterAll(async () => {
  await looseService().from('profiles').update({ company: null }).in('id', Object.values(ids))
})

async function stored(id: string) {
  const { data, error } = await looseService()
    .from('profiles')
    .select('role, status, cohort_id, email, company')
    .eq('id', id)
    .single()
  expect(error).toBeNull()
  return data!
}

describe('profiles — 권한 상승·컬럼 보호', () => {
  test('#1 일반 회원이 role=admin 으로 올리려 하면 거부되고 값이 그대로다', async () => {
    const c = (await signedInClient('student')) as unknown as LooseClient
    const { error } = await c.from('profiles').update({ role: 'admin' }).eq('id', ids.student)
    expect(error?.code).toBe(PERMISSION_DENIED)
    expect((await stored(ids.student)).role).toBe('member')
  })

  test('#2 status / cohort_id / email 수정도 거부된다', async () => {
    const pending = (await signedInClient('pending')) as unknown as LooseClient
    const r1 = await pending.from('profiles').update({ status: 'active' }).eq('id', ids.pending)
    expect(r1.error?.code).toBe(PERMISSION_DENIED)
    expect((await stored(ids.pending)).status).toBe('pending')

    const student = (await signedInClient('student')) as unknown as LooseClient
    const before = await stored(ids.student)
    const r2 = await student.from('profiles').update({ cohort_id: 1 }).eq('id', ids.student)
    const r3 = await student.from('profiles').update({ email: 'hacker@example.com' }).eq('id', ids.student)
    expect(r2.error?.code).toBe(PERMISSION_DENIED)
    expect(r3.error?.code).toBe(PERMISSION_DENIED)
    const after = await stored(ids.student)
    expect(after.cohort_id).toBe(before.cohort_id)
    expect(after.email).toBe(before.email)
  })

  test('허용 컬럼(company)은 본인이 수정할 수 있고, 남의 프로필은 수정할 수 없다', async () => {
    const student = await signedInClient('student')
    const own = await student.from('profiles').update({ company: '테스트(주)' }).eq('id', ids.student).select('id')
    expect(own.error).toBeNull()
    expect(own.data).toHaveLength(1)
    expect((await stored(ids.student)).company).toBe('테스트(주)')

    const other = await student.from('profiles').update({ company: '탈취' }).eq('id', ids.grad).select('id')
    expect(other.data ?? []).toHaveLength(0) // RLS 가 행을 걸러낸다 (오류 없이 0건)
    expect((await stored(ids.grad)).company).toBeNull()
  })

  test('일반 회원은 본인 프로필만 직접 조회할 수 있다', async () => {
    const student = await signedInClient('student')
    const { data, error } = await student.from('profiles').select('id, email').in('id', Object.values(ids))
    expect(error).toBeNull()
    expect(data?.map((r) => r.id)).toEqual([ids.student])
  })

  test('승인 대기 회원도 본인 프로필만 조회할 수 있다', async () => {
    const pending = await signedInClient('pending')
    const { data } = await pending.from('profiles').select('id').in('id', Object.values(ids))
    expect(data?.map((r) => r.id)).toEqual([ids.pending])
  })

  test('운영진은 전체 프로필을 조회할 수 있다', async () => {
    const admin = await signedInClient('admin')
    const { data, error } = await admin.from('profiles').select('id').in('id', Object.values(ids))
    expect(error).toBeNull()
    expect(data).toHaveLength(4)
  })
})

describe('anon 차단', () => {
  const tables = [
    'cohorts',
    'profiles',
    'roster',
    'resources',
    'announcements',
    'announcement_reads',
    'activity_log',
    'notification_jobs',
    'notification_deliveries',
  ]

  test.each(tables)('#11 anon 은 %s 를 읽을 수 없다', async (table) => {
    const c = anonClient() as unknown as LooseClient
    const { data, error } = await c.from(table).select('*').limit(1)
    expect(error).not.toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  test('anon 은 RPC 도 호출할 수 없다', async () => {
    const c = anonClient()
    const dir = await c.rpc('directory_members', {})
    const stats = await c.rpc('admin_stats', {})
    expect(dir.error).not.toBeNull()
    expect(stats.error).not.toBeNull()
  })
})
