// Design §5.4 /library 검색 — 앱이 실제로 보내는 쿼리(search_text ilike + escapeLike)가 DB 에서 의도대로 동작하는지
import { describe, expect, test } from 'vitest'
import { escapeLike } from '../../src/features/library/params'
import { ALL_RESOURCE_IDS, FIXED, type TestUserKey } from './helpers'
import { signedInClient } from './session'

async function search(key: TestUserKey, q: string, escape = true): Promise<string[]> {
  const c = await signedInClient(key)
  const term = escape ? escapeLike(q.toLowerCase()) : q.toLowerCase()
  const { data, error } = await c
    .from('resources')
    .select('id')
    .eq('is_published', true)
    .in('id', ALL_RESOURCE_IDS)
    .ilike('search_text', `%${term}%`)
  expect(error).toBeNull()
  return (data ?? []).map((r) => r.id).sort()
}

const sorted = (ids: string[]) => [...ids].sort()
const { c17, c12, common } = FIXED.resource

describe('자료 검색 (search_text ilike)', () => {
  test('한글 부분 검색이 되고, 권한 필터(RLS)가 함께 적용된다', async () => {
    expect(await search('student', '17기')).toEqual([c17])
    expect(await search('student', '자료')).toEqual(sorted([c17, common])) // 12기 자료는 재학생에게 안 보인다
    expect(await search('grad', '12기')).toEqual([c12]) // 미공개 12기 자료는 제외
    expect(await search('grad', '자료')).toEqual(sorted([c17, c12, common]))
  })

  test('대소문자를 구분하지 않고, 태그도 검색된다', async () => {
    expect(await search('student', 'RLS')).toEqual(sorted([c17, common]))
    expect(await search('student', 'rls')).toEqual(sorted([c17, common]))
    expect(await search('student', 'rls-test')).toEqual(sorted([c17, common])) // 태그
  })

  test('일치하는 것이 없으면 빈 결과', async () => {
    expect(await search('admin', '존재하지않는검색어zzz')).toEqual([])
  })

  test('%, _, \\ 는 문자 그대로 검색한다 (이스케이프하지 않으면 전체가 걸린다)', async () => {
    for (const q of ['%', '_', '\\', '100%', 'a_b']) {
      expect(await search('admin', q), `이스케이프한 "${q}"`).toEqual([])
    }
    // 대조군: 이스케이프를 하지 않으면 '%' 가 와일드카드가 되어 공개 자료가 모두 걸린다
    expect((await search('admin', '%', false)).length).toBeGreaterThanOrEqual(3)
  })
})
