// Design §7.2 — 권한 매트릭스의 나머지 경계: roster / cohorts / activity_log / 공지 수정·삭제 / 읽음 기록
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { FIXED, cohortIdByNumber, getUserIds, looseService, serviceClient, type LooseClient } from './helpers'
import { signedInClient } from './session'

let ids: Awaited<ReturnType<typeof getUserIds>>

beforeAll(async () => {
  ids = await getUserIds()
})

afterAll(async () => {
  await serviceClient()
    .from('announcement_reads')
    .delete()
    .eq('announcement_id', FIXED.announcement.published)
    .in('user_id', [ids.grad, ids.student])
})

describe('roster — 운영진 전용', () => {
  test('일반 회원·승인 대기는 명단을 읽을 수 없다 (0건)', async () => {
    for (const key of ['student', 'pending'] as const) {
      const c = await signedInClient(key)
      const { data, error } = await c.from('roster').select('email')
      expect(error).toBeNull()
      expect(data ?? []).toHaveLength(0)
    }
  })

  test('일반 회원은 명단에 행을 추가·수정할 수 없다', async () => {
    const c = await signedInClient('student')
    const c17 = await cohortIdByNumber(17)
    const ins = await c.from('roster').insert({ email: 'rls-tmp-intruder@example.com', name: 'x', cohort_id: c17, role: 'admin' })
    expect(ins.error?.code).toBe('42501')
    const upd = await c.from('roster').update({ role: 'admin' }).eq('email', 'rls-student17@example.com').select('id')
    expect(upd.data ?? []).toHaveLength(0)
  })

  test('운영진은 명단을 읽을 수 있다', async () => {
    const c = await signedInClient('admin')
    const { data, error } = await c.from('roster').select('email').in('email', ['rls-admin@example.com', 'rls-student17@example.com'])
    expect(error).toBeNull()
    expect(data).toHaveLength(2)
  })
})

describe('cohorts', () => {
  test('활성 회원은 기수 목록을 읽고, 승인 대기는 못 읽는다', async () => {
    const student = await signedInClient('student')
    const a = await student.from('cohorts').select('number')
    expect(a.error).toBeNull()
    expect((a.data ?? []).length).toBeGreaterThanOrEqual(17)

    const pending = await signedInClient('pending')
    const b = await pending.from('cohorts').select('number')
    expect(b.data ?? []).toHaveLength(0)
  })

  test('일반 회원은 기수를 만들거나 재학 여부를 바꿀 수 없다', async () => {
    const c = await signedInClient('student')
    const ins = await c.from('cohorts').insert({ number: 99, name: '99기' })
    expect(ins.error?.code).toBe('42501')

    const upd = await c.from('cohorts').update({ is_active: false }).eq('number', 17).select('id')
    expect(upd.data ?? []).toHaveLength(0)
    const { data } = await serviceClient().from('cohorts').select('is_active').eq('number', 17).single()
    expect(data?.is_active).toBe(true)
  })
})

describe('activity_log — 운영진만 조회', () => {
  test('회원이 로그를 남겨도 회원 본인은 조회할 수 없고, 운영진은 볼 수 있다', async () => {
    const student = await signedInClient('student')
    const r = await student.rpc('log_activity', { p_event: 'view_announcement', p_ref: FIXED.announcement.published, p_device: 'mobile' })
    expect(r.error).toBeNull()

    const own = await student.from('activity_log').select('id')
    expect(own.error).toBeNull()
    expect(own.data ?? []).toHaveLength(0)

    const admin = await signedInClient('admin')
    const seen = await admin.from('activity_log').select('id, event').eq('user_id', ids.student).eq('event', 'view_announcement')
    expect(seen.error).toBeNull()
    expect((seen.data ?? []).length).toBeGreaterThanOrEqual(1)
  })

  test('로그를 수정·삭제할 수 없다', async () => {
    const c = (await signedInClient('student')) as unknown as LooseClient
    const upd = await c.from('activity_log').update({ event: 'visit' }).eq('user_id', ids.student)
    const del = await c.from('activity_log').delete().eq('user_id', ids.student)
    expect(upd.error?.code).toBe('42501')
    expect(del.error?.code).toBe('42501')
  })
})

describe('announcements — 수정·삭제', () => {
  test('일반 회원은 공지를 수정·삭제할 수 없다 (내용 불변)', async () => {
    const c = await signedInClient('student')
    const upd = await c.from('announcements').update({ title: '변조' }).eq('id', FIXED.announcement.published).select('id')
    const del = await c.from('announcements').delete().eq('id', FIXED.announcement.published).select('id')
    expect(upd.data ?? []).toHaveLength(0)
    expect(del.data ?? []).toHaveLength(0)
    const { data } = await serviceClient().from('announcements').select('title').eq('id', FIXED.announcement.published).single()
    expect(data?.title).toBe('RLS 게시된 공지')
  })

  test('운영진은 임시저장 공지를 수정하고 게시할 수 있다', async () => {
    const admin = await signedInClient('admin')
    const upd = await admin.from('announcements').update({ title: 'RLS 임시저장 공지(수정)' }).eq('id', FIXED.announcement.draft).select('title').single()
    expect(upd.error).toBeNull()
    expect(upd.data?.title).toBe('RLS 임시저장 공지(수정)')
    await serviceClient().from('announcements').update({ title: 'RLS 임시저장 공지' }).eq('id', FIXED.announcement.draft)
  })
})

describe('announcement_reads — 본인 기록만', () => {
  test('다른 회원의 읽음 기록은 조회·수정할 수 없다', async () => {
    const svc = serviceClient()
    await svc.from('announcement_reads').upsert({ announcement_id: FIXED.announcement.published, user_id: ids.grad })

    const student = await signedInClient('student')
    const other = await student.from('announcement_reads').select('user_id').eq('user_id', ids.grad)
    expect(other.error).toBeNull()
    expect(other.data ?? []).toHaveLength(0)

    const del = await student.from('announcement_reads').delete().eq('user_id', ids.grad).select('user_id')
    expect(del.data ?? []).toHaveLength(0)
    const { data } = await looseService().from('announcement_reads').select('user_id').eq('user_id', ids.grad)
    expect(data).toHaveLength(1) // 삭제되지 않음
  })

  test('승인 대기 회원은 읽음 기록을 남길 수 없다', async () => {
    const pending = await signedInClient('pending')
    const { error } = await pending
      .from('announcement_reads')
      .upsert({ announcement_id: FIXED.announcement.published, user_id: ids.pending })
    expect(error).not.toBeNull()
  })
})
