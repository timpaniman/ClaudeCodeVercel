import { describe, expect, test } from 'vitest'
import { PROFILE_LIMITS, normalizeUrl, validateProfile, type ProfileInput } from '@/features/me/profile'
import { countByCohort, filterMembers, sortByName, type Member } from '@/features/directory/members'

const input = (over: Partial<ProfileInput> = {}): ProfileInput => ({
  name: '홍길동', company: '', position: '', bio: '', github_url: '', linkedin_url: '', website_url: '', ...over,
})

describe('validateProfile', () => {
  test('최소 입력은 통과하고 빈 값은 null 이 된다', () => {
    expect(validateProfile(input())).toEqual({
      ok: true,
      value: { name: '홍길동', company: null, position: null, bio: null, github_url: null, linkedin_url: null, website_url: null },
    })
  })
  test('앞뒤 공백을 다듬고 주소를 정규화한다', () => {
    const v = validateProfile(input({ name: '  홍길동 ', company: ' 테스트(주) ', github_url: ' https://github.com/hong ', website_url: 'https://example.com' }))
    expect(v).toMatchObject({ ok: true, value: { name: '홍길동', company: '테스트(주)', github_url: 'https://github.com/hong', website_url: 'https://example.com/' } })
  })
  test('이름은 필수, 길이 제한', () => {
    expect(validateProfile(input({ name: '  ' }))).toMatchObject({ ok: false, errors: { name: expect.stringContaining('입력') } })
    expect(validateProfile(input({ name: 'a'.repeat(PROFILE_LIMITS.name + 1) }))).toMatchObject({ ok: false, errors: { name: expect.any(String) } })
    expect(validateProfile(input({ bio: 'a'.repeat(PROFILE_LIMITS.bio + 1) }))).toMatchObject({ ok: false, errors: { bio: expect.any(String) } })
    expect(validateProfile(input({ bio: 'a'.repeat(PROFILE_LIMITS.bio) })).ok).toBe(true)
  })
  test('여러 오류를 한 번에 알려 준다', () => {
    const v = validateProfile(input({ name: '', company: 'x'.repeat(101), website_url: 'http://a.com' }))
    expect(v.ok).toBe(false)
    if (!v.ok) expect(Object.keys(v.errors).sort()).toEqual(['company', 'name', 'website_url'])
  })
  test('GitHub·LinkedIn 은 해당 도메인만, 웹사이트는 https 만', () => {
    expect(validateProfile(input({ github_url: 'https://gitlab.com/x' })).ok).toBe(false)
    expect(validateProfile(input({ github_url: 'https://evilgithub.com/x' })).ok).toBe(false)
    expect(validateProfile(input({ github_url: 'https://github.com.evil.com/x' })).ok).toBe(false)
    expect(validateProfile(input({ linkedin_url: 'https://kr.linkedin.com/in/hong' })).ok).toBe(true)
    expect(validateProfile(input({ linkedin_url: 'https://www.linkedin.com/in/hong' })).ok).toBe(true)
    expect(validateProfile(input({ website_url: 'javascript:alert(1)' })).ok).toBe(false)
    expect(validateProfile(input({ website_url: 'http://example.com' })).ok).toBe(false)
    expect(validateProfile(input({ website_url: 'https://user:pw@example.com' })).ok).toBe(false)
  })
  test('너무 긴 주소는 거부', () => {
    expect(validateProfile(input({ website_url: 'https://example.com/' + 'a'.repeat(400) })).ok).toBe(false)
  })
})

describe('normalizeUrl', () => {
  test.each([
    ['https://github.com/a', ['github.com'], true],
    ['https://GITHUB.COM/a', ['github.com'], true],
    ['https://gist.github.com/a', ['github.com'], true],
    ['https://notgithub.com/a', ['github.com'], false],
    ['ftp://github.com/a', ['github.com'], false],
    ['not a url', undefined, false],
    ['https://example.com', undefined, true],
  ] as const)('%s hosts=%j → %s', (raw, hosts, ok) => {
    expect(normalizeUrl(raw, hosts) !== null).toBe(ok)
  })
})

const m = (over: Partial<Member>): Member => ({
  id: 'x', name: '이름', company: null, position: null, bio: null, avatarUrl: null, githubUrl: null, linkedinUrl: null, websiteUrl: null, cohortId: 1, ...over,
})
const members = [
  m({ id: '1', name: '홍길동', company: '오레노', position: '대표', cohortId: 17 }),
  m({ id: '2', name: '김철수', company: '리비전', position: 'CTO', cohortId: 12 }),
  m({ id: '3', name: '이서연', company: '플레인테이블', position: 'COO', cohortId: 12 }),
  m({ id: '4', name: '가나다', company: null, position: null, cohortId: null }),
]

describe('filterMembers / countByCohort / sortByName', () => {
  test('이름·회사·직책 검색, 대소문자 무시, 여러 단어는 모두 포함', () => {
    expect(filterMembers(members, '길동').map((x) => x.id)).toEqual(['1'])
    expect(filterMembers(members, '리비전').map((x) => x.id)).toEqual(['2'])
    expect(filterMembers(members, 'cto').map((x) => x.id)).toEqual(['2'])
    expect(filterMembers(members, '플레인 coo').map((x) => x.id)).toEqual(['3'])
    expect(filterMembers(members, '플레인 CTO')).toEqual([])
    expect(filterMembers(members, '   ')).toHaveLength(4)
  })
  test('기수별 인원 (기수 없는 멤버는 제외)', () => {
    expect(Object.fromEntries(countByCohort(members))).toEqual({ 17: 1, 12: 2 })
  })
  test('가나다 순 정렬 (원본 불변)', () => {
    expect(sortByName(members).map((x) => x.name)).toEqual(['가나다', '김철수', '이서연', '홍길동'])
    expect(members[0].name).toBe('홍길동')
  })
})
