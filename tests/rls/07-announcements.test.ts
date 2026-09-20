// Design §3.4, §5.4 — 공지: 임시저장→게시 흐름, 예약(미래 게시일)/게시 취소, 알림 job 중복 방지, 읽음 기록 멱등성
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { getUserIds, serviceClient } from './helpers'
import { signedInClient } from './session'

let ids: Awaited<ReturnType<typeof getUserIds>>
const created: string[] = []

beforeAll(async () => {
  ids = await getUserIds()
})

afterAll(async () => {
  const svc = serviceClient()
  if (created.length) {
    await svc.from('notification_jobs').delete().in('ref_id', created)
    await svc.from('announcements').delete().in('id', created) // announcement_reads 는 cascade
  }
})

async function newDraft(title: string, extra: Record<string, unknown> = {}) {
  const admin = await signedInClient('admin')
  const { data, error } = await admin
    .from('announcements')
    .insert({ author_id: ids.admin, title: `RLS-ann ${title}`, body: '본문', ...extra })
    .select('id')
    .single()
  expect(error).toBeNull()
  created.push(data!.id)
  return data!.id
}

async function studentSees(id: string): Promise<boolean> {
  const student = await signedInClient('student')
  const { data, error } = await student.from('announcements').select('id').eq('id', id)
  expect(error).toBeNull()
  return (data ?? []).length === 1
}

describe('publish_announcement', () => {
  test('임시저장은 회원에게 안 보이고, 게시하면 보인다 (알림 없이)', async () => {
    const id = await newDraft('게시 흐름')
    expect(await studentSees(id)).toBe(false)

    const admin = await signedInClient('admin')
    const r = await admin.rpc('publish_announcement', { p_id: id, p_notify: false })
    expect(r.error).toBeNull()
    expect(r.data).toBeNull() // 알림 job 없음

    expect(await studentSees(id)).toBe(true)
    const { data: jobs } = await serviceClient().from('notification_jobs').select('id').eq('ref_id', id)
    expect(jobs ?? []).toHaveLength(0)
  })

  test('다시 게시해도 최초 게시일이 유지된다 (coalesce)', async () => {
    const id = await newDraft('게시일 유지')
    const admin = await signedInClient('admin')
    await admin.rpc('publish_announcement', { p_id: id, p_notify: false })
    const first = (await serviceClient().from('announcements').select('published_at').eq('id', id).single()).data!.published_at
    await new Promise((r) => setTimeout(r, 1100))
    await admin.rpc('publish_announcement', { p_id: id, p_notify: false })
    const second = (await serviceClient().from('announcements').select('published_at').eq('id', id).single()).data!.published_at
    expect(second).toBe(first)
  })

  test('알림 요청은 job 을 한 번만 만든다', async () => {
    const id = await newDraft('알림 job')
    const admin = await signedInClient('admin')
    const a = await admin.rpc('publish_announcement', { p_id: id, p_notify: true })
    expect(typeof a.data).toBe('string')
    const b = await admin.rpc('publish_announcement', { p_id: id, p_notify: true })
    expect(b.data).toBeNull()
    const { data: jobs } = await serviceClient().from('notification_jobs').select('kind,status').eq('ref_id', id)
    expect(jobs).toEqual([{ kind: 'announcement', status: 'queued' }])
  })

  test('게시 취소(published_at=null)하면 회원에게 다시 안 보인다', async () => {
    const id = await newDraft('게시 취소')
    const admin = await signedInClient('admin')
    await admin.rpc('publish_announcement', { p_id: id, p_notify: false })
    expect(await studentSees(id)).toBe(true)

    const { error } = await admin.from('announcements').update({ published_at: null }).eq('id', id)
    expect(error).toBeNull()
    expect(await studentSees(id)).toBe(false)
  })

  test('미래 게시일(예약)은 그 시각 전에는 회원에게 안 보인다', async () => {
    const id = await newDraft('예약', { published_at: new Date(Date.now() + 3600_000).toISOString() })
    expect(await studentSees(id)).toBe(false)
    const admin = await signedInClient('admin')
    const { data } = await admin.from('announcements').select('id').eq('id', id)
    expect(data).toHaveLength(1) // 운영진은 보인다
  })

  test('일반 회원·승인 대기는 게시할 수 없고, 없는 공지는 not found', async () => {
    const id = await newDraft('권한')
    for (const key of ['student', 'pending'] as const) {
      const c = await signedInClient(key)
      const { error } = await c.rpc('publish_announcement', { p_id: id, p_notify: false })
      expect(error?.code).toBe('42501')
    }
    const admin = await signedInClient('admin')
    const nf = await admin.rpc('publish_announcement', { p_id: '00000000-0000-4000-8000-00000000ffff', p_notify: false })
    expect(nf.error?.code).toBe('P0002')
  })
})

describe('announcement_reads', () => {
  test('읽음 기록은 여러 번 저장해도 1건이다 (ignoreDuplicates)', async () => {
    const id = await newDraft('읽음')
    const admin = await signedInClient('admin')
    await admin.rpc('publish_announcement', { p_id: id, p_notify: false })

    const student = await signedInClient('student')
    for (let i = 0; i < 3; i++) {
      const { error } = await student
        .from('announcement_reads')
        .upsert({ announcement_id: id, user_id: ids.student }, { onConflict: 'announcement_id,user_id', ignoreDuplicates: true })
      expect(error).toBeNull()
    }
    const { data } = await student.from('announcement_reads').select('announcement_id').eq('announcement_id', id).eq('user_id', ids.student)
    expect(data).toHaveLength(1)
  })
})
