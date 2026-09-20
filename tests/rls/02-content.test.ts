// Design §8.2 — L0 RLS: 자료·공지 열람 권한, 쓰기 권한, Storage
import { beforeAll, describe, expect, test } from 'vitest'
import {
  ALL_ANNOUNCEMENT_IDS,
  ALL_RESOURCE_IDS,
  FIXED,
  STORAGE_PATHS,
  anonClient,
  getUserIds,
  looseService,
  serviceClient,
  type LooseClient,
  type TestUserKey,
} from './helpers'
import { signedInClient } from './session'

let ids: Awaited<ReturnType<typeof getUserIds>>

beforeAll(async () => {
  ids = await getUserIds()
})

async function visibleResources(key: TestUserKey): Promise<string[]> {
  const c = await signedInClient(key)
  const { data, error } = await c.from('resources').select('id').in('id', ALL_RESOURCE_IDS)
  expect(error).toBeNull()
  return (data ?? []).map((r) => r.id).sort()
}

async function visibleAnnouncements(key: TestUserKey): Promise<string[]> {
  const c = await signedInClient(key)
  const { data, error } = await c.from('announcements').select('id').in('id', ALL_ANNOUNCEMENT_IDS)
  expect(error).toBeNull()
  return (data ?? []).map((r) => r.id).sort()
}

const sorted = (xs: string[]) => [...xs].sort()

describe('자료 열람 권한 (§7.2)', () => {
  test('#3 승인 대기 사용자는 자료·공지를 볼 수 없다', async () => {
    expect(await visibleResources('pending')).toEqual([])
    expect(await visibleAnnouncements('pending')).toEqual([])
  })

  test('#4 재학생(17기)은 본 기수 + 공용만 본다 (12기 자료는 못 본다)', async () => {
    expect(await visibleResources('student')).toEqual(sorted([FIXED.resource.c17, FIXED.resource.common]))
  })

  test('#5 졸업생(12기)은 전 기수 공개 자료를 본다', async () => {
    expect(await visibleResources('grad')).toEqual(
      sorted([FIXED.resource.c17, FIXED.resource.c12, FIXED.resource.common]),
    )
  })

  test('#6 미공개 자료는 회원에게 안 보이고 운영진에게만 보인다', async () => {
    for (const key of ['student', 'grad'] as const) {
      expect(await visibleResources(key)).not.toContain(FIXED.resource.c12Draft)
    }
    expect(await visibleResources('admin')).toEqual(sorted(ALL_RESOURCE_IDS))
  })

  test('기수 열람 규칙은 cohorts.is_active 에서 파생된다 (12기를 재학으로 바꾸면 17기 자료는 잠긴다)', async () => {
    const svc = serviceClient()
    const { data: c12 } = await svc.from('cohorts').select('id').eq('number', 12).single()
    const { data: c17 } = await svc.from('cohorts').select('id').eq('number', 17).single()
    try {
      await svc.from('cohorts').update({ is_active: true }).eq('id', c12!.id)
      // 12기가 재학이 되면 grad(12기)는 본 기수 + 공용만 본다
      expect(await visibleResources('grad')).toEqual(sorted([FIXED.resource.c12, FIXED.resource.common]))
      // 17기는 그대로 재학 → student 는 변함 없음
      expect(await visibleResources('student')).toEqual(sorted([FIXED.resource.c17, FIXED.resource.common]))
    } finally {
      await svc.from('cohorts').update({ is_active: false }).eq('id', c12!.id)
      await svc.from('cohorts').update({ is_active: true }).eq('id', c17!.id)
    }
    expect(await visibleResources('grad')).toEqual(
      sorted([FIXED.resource.c17, FIXED.resource.c12, FIXED.resource.common]),
    )
  })
})

describe('공지 열람', () => {
  test('회원은 게시된 공지만 보고 임시저장은 못 본다, 운영진은 둘 다 본다', async () => {
    expect(await visibleAnnouncements('student')).toEqual([FIXED.announcement.published])
    expect(await visibleAnnouncements('grad')).toEqual([FIXED.announcement.published])
    expect(await visibleAnnouncements('admin')).toEqual(sorted(ALL_ANNOUNCEMENT_IDS))
  })

  test('읽음 표시는 본인 것만 기록할 수 있다', async () => {
    const student = await signedInClient('student')
    const own = await student
      .from('announcement_reads')
      .upsert({ announcement_id: FIXED.announcement.published, user_id: ids.student })
    expect(own.error).toBeNull()

    const forged = await student
      .from('announcement_reads')
      .upsert({ announcement_id: FIXED.announcement.published, user_id: ids.grad })
    expect(forged.error).not.toBeNull()

    const { data } = await looseService()
      .from('announcement_reads')
      .select('user_id')
      .eq('announcement_id', FIXED.announcement.published)
      .eq('user_id', ids.grad)
    expect(data ?? []).toHaveLength(0)
  })
})

describe('쓰기 권한', () => {
  test('#7 일반 회원은 자료를 등록·수정·삭제할 수 없다', async () => {
    const student = await signedInClient('student')

    const ins = await student.from('resources').insert({
      uploader_id: ids.student,
      title: '침입 자료',
      category: 'lecture',
      external_url: 'https://example.com/x',
    })
    expect(ins.error?.code).toBe('42501')

    const upd = await student.from('resources').update({ title: '변조' }).eq('id', FIXED.resource.c17).select('id')
    expect(upd.data ?? []).toHaveLength(0)

    const del = await student.from('resources').delete().eq('id', FIXED.resource.c17).select('id')
    expect(del.data ?? []).toHaveLength(0)

    const { data } = await serviceClient().from('resources').select('title').eq('id', FIXED.resource.c17).single()
    expect(data?.title).toBe('RLS 17기 자료')
  })

  test('일반 회원은 공지를 등록할 수 없다', async () => {
    const student = await signedInClient('student')
    const ins = await student.from('announcements').insert({ author_id: ids.student, title: '가짜 공지', body: 'x' })
    expect(ins.error?.code).toBe('42501')
  })

  test('운영진은 자료를 등록·수정할 수 있다', async () => {
    const admin = await signedInClient('admin')
    const ins = await admin
      .from('resources')
      .insert({ uploader_id: ids.admin, title: 'RLS 운영진 임시 자료', category: 'code', external_url: 'https://example.com/t', tags: ['rls-test'] })
      .select('id, search_text')
      .single()
    expect(ins.error).toBeNull()
    expect(ins.data?.search_text).toContain('rls 운영진 임시 자료') // search_text 트리거

    const upd = await admin.from('resources').update({ title: 'RLS 수정됨' }).eq('id', ins.data!.id).select('search_text').single()
    expect(upd.data?.search_text).toContain('rls 수정됨')

    await admin.from('resources').delete().eq('id', ins.data!.id)
  })
})

describe('Storage 열람 권한 (#Storage)', () => {
  const sign = async (client: LooseClient, path: string) =>
    client.storage.from('resources').createSignedUrl(path, 60)

  test('재학생은 본 기수 파일만, 졸업생은 전 기수 파일을 받을 수 있다', async () => {
    const student = (await signedInClient('student')) as unknown as LooseClient
    const grad = (await signedInClient('grad')) as unknown as LooseClient

    expect((await sign(student, STORAGE_PATHS.c17)).error).toBeNull()
    expect((await sign(student, STORAGE_PATHS.c12)).error).not.toBeNull()

    expect((await sign(grad, STORAGE_PATHS.c17)).error).toBeNull()
    expect((await sign(grad, STORAGE_PATHS.c12)).error).toBeNull()
  })

  test('승인 대기·anon 은 파일을 받을 수 없다', async () => {
    const pending = (await signedInClient('pending')) as unknown as LooseClient
    expect((await sign(pending, STORAGE_PATHS.c17)).error).not.toBeNull()
    expect((await sign(anonClient() as unknown as LooseClient, STORAGE_PATHS.c17)).error).not.toBeNull()
  })

  test('일반 회원은 업로드할 수 없다', async () => {
    const student = await signedInClient('student')
    const up = await student.storage
      .from('resources')
      .upload(`17/${FIXED.resource.c17}/intruder.txt`, new Blob(['x']), { contentType: 'text/plain' })
    expect(up.error).not.toBeNull()
  })
})
