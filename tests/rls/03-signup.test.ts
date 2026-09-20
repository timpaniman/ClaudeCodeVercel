// Design §8.2 — L0: 가입 트리거(명단 대조), 명단 import RPC, 회원 승인 RPC
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  TEST_USERS,
  cohortIdByNumber,
  deleteAuthUserByEmail,
  getUserIds,
  looseService,
  passwordFor,
  serviceClient,
} from './helpers'
import { signedInClient } from './session'

let ids: Awaited<ReturnType<typeof getUserIds>>
let c12: number
let c17: number
const created: string[] = []

beforeAll(async () => {
  ids = await getUserIds()
  c12 = await cohortIdByNumber(12)
  c17 = await cohortIdByNumber(17)
})

afterAll(async () => {
  for (const email of created) await deleteAuthUserByEmail(email)
  await serviceClient().from('roster').delete().like('email', 'rls-tmp-%@example.com')
})

async function makeUser(meta: Record<string, unknown>) {
  const email = `rls-tmp-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
  const { data, error } = await serviceClient().auth.admin.createUser({
    email,
    password: passwordFor(email),
    email_confirm: true,
    user_metadata: meta,
  })
  expect(error).toBeNull()
  created.push(email)
  return { id: data.user!.id, email }
}

async function profile(id: string) {
  const { data, error } = await looseService()
    .from('profiles')
    .select('status, role, cohort_id, requested_cohort, name, email')
    .eq('id', id)
    .single()
  expect(error).toBeNull()
  return data!
}

describe('가입 트리거 — 명단 대조', () => {
  test('#8 명단에 있는 이메일은 즉시 active, 기수·역할이 자동 부여되고 roster 가 claimed 된다', async () => {
    const expected = { admin: [c17, 'admin'], student: [c17, 'member'], grad: [c12, 'member'] } as const
    for (const key of ['admin', 'student', 'grad'] as const) {
      const p = await profile(ids[key])
      expect(p.status).toBe('active')
      expect(p.cohort_id).toBe(expected[key][0])
      expect(p.role).toBe(expected[key][1])

      const { data: r } = await serviceClient().from('roster').select('claimed_by').eq('email', TEST_USERS[key].email).single()
      expect(r?.claimed_by).toBe(ids[key])
    }
  })

  test('명단에 없는 이메일은 pending 이고 기수가 없다', async () => {
    const p = await profile(ids.pending)
    expect(p.status).toBe('pending')
    expect(p.cohort_id).toBeNull()
    expect(p.role).toBe('member')
  })

  test('신청 정보(user_metadata)를 pending 프로필에 옮긴다 — 숫자가 아닌 requested_cohort 도 가입을 막지 않는다', async () => {
    const ok = await makeUser({ name: '임시 신청자', requested_cohort: '12' })
    const bad = await makeUser({ name: '이상한 값', requested_cohort: 'abc' })
    const none = await makeUser({})

    const a = await profile(ok.id)
    expect(a.status).toBe('pending')
    expect(a.requested_cohort).toBe(12)
    expect(a.name).toBe('임시 신청자')

    const b = await profile(bad.id)
    expect(b.status).toBe('pending')
    expect(b.requested_cohort).toBeNull()

    const c = await profile(none.id)
    expect(c.name).toBe(none.email.split('@')[0]) // 이름 없으면 이메일 앞부분
  })

  // 007_signup_consent.sql 이 적용된 DB 에서만 통과한다 (로그인 화면이 consent 메타데이터를 보낸다)
  test('개인정보 동의(consent=true 메타데이터)는 서버 시각으로 consented_at 에 기록된다', async () => {
    const agreed = await makeUser({ consent: true })
    const notAgreed = await makeUser({})
    const garbage = await makeUser({ consent: 'yes' })
    const read = async (id: string) => {
      const { data } = await looseService().from('profiles').select('consented_at').eq('id', id).single()
      return data?.consented_at as string | null
    }

    const ts = await read(agreed.id)
    expect(ts).not.toBeNull()
    expect(Math.abs(Date.now() - new Date(ts as string).getTime())).toBeLessThan(60_000)
    expect(await read(notAgreed.id)).toBeNull()
    expect(await read(garbage.id)).toBeNull() // 정확히 true 일 때만
  })

  test('명단에 있는 회원의 가입에서도 동의가 기록된다', async () => {
    const email = `rls-tmp-consent-${Date.now()}@example.com`
    const c12id = await cohortIdByNumber(12)
    await serviceClient().from('roster').insert({ email, name: '명단 동의', cohort_id: c12id })
    const { data, error } = await serviceClient().auth.admin.createUser({
      email, password: passwordFor(email), email_confirm: true, user_metadata: { consent: true },
    })
    expect(error).toBeNull()
    created.push(email)
    const { data: p } = await looseService().from('profiles').select('status, consented_at').eq('id', data.user!.id).single()
    expect(p?.status).toBe('active')
    expect(p?.consented_at).not.toBeNull()
  })

  test('이메일 대소문자가 달라도 소문자로 정규화되어 저장된다', async () => {
    const email = `RLS-Tmp-${Date.now()}@Example.com`
    const { data, error } = await serviceClient().auth.admin.createUser({ email, email_confirm: true })
    expect(error).toBeNull()
    created.push(email.toLowerCase())
    expect((await profile(data.user!.id)).email).toBe(email.toLowerCase())
  })
})

describe('admin_import_roster', () => {
  test('#9 명단이 나중에 등록되면 기존 pending 회원이 자동으로 active 가 된다', async () => {
    const u = await makeUser({ name: '나중에 등록' })
    expect((await profile(u.id)).status).toBe('pending')

    const admin = await signedInClient('admin')
    const { data, error } = await admin.rpc('admin_import_roster', {
      rows: [{ email: u.email.toUpperCase(), name: '나중에 등록', cohort_number: 12 }],
    })
    expect(error).toBeNull()
    const result = data as Record<string, number>
    expect(result.inserted).toBe(1)
    expect(result.activated).toBe(1)

    const p = await profile(u.id)
    expect(p.status).toBe('active')
    expect(p.cohort_id).toBe(c12)

    const { data: r } = await serviceClient().from('roster').select('claimed_by').eq('email', u.email).single()
    expect(r?.claimed_by).toBe(u.id)
  })

  test('이미 가입한(claimed) 명단은 수정하지 않는다 (skipped)', async () => {
    const admin = await signedInClient('admin')
    const { data, error } = await admin.rpc('admin_import_roster', {
      rows: [{ email: TEST_USERS.student.email, name: '이름 변조', cohort_number: 1 }],
    })
    expect(error).toBeNull()
    expect((data as Record<string, number>).skipped).toBe(1)
    const p = await profile(ids.student)
    expect(p.cohort_id).toBe(c17)
  })

  test('존재하지 않는 기수는 전체를 롤백하고 오류를 낸다', async () => {
    const email = `rls-tmp-rollback-${Date.now()}@example.com`
    const admin = await signedInClient('admin')
    const { error } = await admin.rpc('admin_import_roster', {
      rows: [
        { email, name: '정상 행', cohort_number: 12 },
        { email: `bad-${email}`, name: '나쁜 행', cohort_number: 99 },
      ],
    })
    expect(error?.code).toBe('22023')
    const { data } = await serviceClient().from('roster').select('email').in('email', [email, `bad-${email}`])
    expect(data ?? []).toHaveLength(0)
  })

  test('잘못된 이메일 형식은 거부한다', async () => {
    const admin = await signedInClient('admin')
    const { error } = await admin.rpc('admin_import_roster', {
      rows: [{ email: 'not-an-email', name: 'x', cohort_number: 12 }],
    })
    expect(error?.code).toBe('22023')
  })

  test('운영진이 아니면(재학생·승인 대기) 호출할 수 없다', async () => {
    for (const key of ['student', 'pending'] as const) {
      const c = await signedInClient(key)
      const { error } = await c.rpc('admin_import_roster', {
        rows: [{ email: `rls-tmp-x-${key}@example.com`, name: 'x', cohort_number: 12 }],
      })
      expect(error?.code).toBe('42501')
    }
  })
})

describe('admin_set_member_status', () => {
  test('운영진은 pending 회원을 기수를 지정해 승인할 수 있다', async () => {
    const u = await makeUser({ name: '승인 대상' })
    const admin = await signedInClient('admin')
    const { error } = await admin.rpc('admin_set_member_status', { p_user: u.id, p_status: 'active', p_cohort: c12 })
    expect(error).toBeNull()
    const p = await profile(u.id)
    expect(p.status).toBe('active')
    expect(p.cohort_id).toBe(c12)
  })

  test('기수 없이 승인하면 거부한다', async () => {
    const u = await makeUser({ name: '기수 없음' })
    const admin = await signedInClient('admin')
    const { error } = await admin.rpc('admin_set_member_status', { p_user: u.id, p_status: 'active' })
    expect(error?.code).toBe('22023')
    expect((await profile(u.id)).status).toBe('pending')
  })

  test('운영진이 자기 자신을 비활성화할 수는 없다', async () => {
    const admin = await signedInClient('admin')
    const { error } = await admin.rpc('admin_set_member_status', { p_user: ids.admin, p_status: 'rejected' })
    expect(error?.code).toBe('22023')
    expect((await profile(ids.admin)).status).toBe('active')
  })

  test('일반 회원은 호출할 수 없다', async () => {
    const student = await signedInClient('student')
    const { error } = await student.rpc('admin_set_member_status', { p_user: ids.pending, p_status: 'active', p_cohort: c17 })
    expect(error?.code).toBe('42501')
    expect((await profile(ids.pending)).status).toBe('pending')
  })
})
