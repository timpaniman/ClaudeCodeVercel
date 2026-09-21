// 009_profile_locale — 회원 언어 설정과 알림 수신자 언어. 009 를 적용하지 않은 프로젝트에서는 이 파일이 실패한다 (007·008 때와 같은 방식).
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { FIXED, getUserIds, looseService, serviceClient } from './helpers'
import { signedInClient } from './session'

let ids: Awaited<ReturnType<typeof getUserIds>>

beforeAll(async () => {
  ids = await getUserIds()
})

afterAll(async () => {
  await looseService().from('profiles').update({ locale: 'en' }).in('id', Object.values(ids))
})

describe('profiles.locale', () => {
  test('기본값은 en 이고, 회원은 자기 언어를 en/ko 로 바꿀 수 있다', async () => {
    const svc = looseService()
    await svc.from('profiles').update({ locale: 'en' }).eq('id', ids.student)
    const student = await signedInClient('student')
    expect((await student.from('profiles').update({ locale: 'ko' }).eq('id', ids.student)).error).toBeNull()
    const { data } = await svc.from('profiles').select('locale').eq('id', ids.student).single()
    expect(data?.locale).toBe('ko')
  })

  test('지원하지 않는 언어 값은 DB 가 거부한다', async () => {
    const student = await signedInClient('student')
    const r = await student.from('profiles').update({ locale: 'fr' }).eq('id', ids.student)
    expect(r.error?.code).toBe('23514')
  })

  test('다른 회원의 언어는 바꿀 수 없다 (RLS)', async () => {
    const student = await signedInClient('student')
    const before = await looseService().from('profiles').select('locale').eq('id', ids.grad).single()
    const r = await student.from('profiles').update({ locale: 'ko' }).eq('id', ids.grad).select('id')
    expect(r.data ?? []).toHaveLength(0)
    const after = await looseService().from('profiles').select('locale').eq('id', ids.grad).single()
    expect(after.data?.locale).toBe(before.data?.locale)
  })
})

describe('notification_recipients 는 수신자 언어를 돌려준다', () => {
  test('service role 호출 결과에 locale 이 있고 회원이 정한 값과 같다', async () => {
    await looseService().from('profiles').update({ locale: 'ko' }).eq('id', ids.student)
    const { data, error } = await serviceClient().rpc('notification_recipients', { p_kind: 'resource', p_ref: FIXED.resource.c17 })
    expect(error).toBeNull()
    const mine = (data ?? []).find((r) => r.user_id === ids.student)
    expect(mine).toBeDefined()
    expect(mine?.locale).toBe('ko')
    for (const row of data ?? []) expect(['en', 'ko']).toContain(row.locale)
  })

  test('일반 회원은 여전히 호출할 수 없다', async () => {
    const student = await signedInClient('student')
    const r = await student.rpc('notification_recipients', { p_kind: 'resource', p_ref: FIXED.resource.c17 })
    expect(r.error).not.toBeNull()
  })
})
