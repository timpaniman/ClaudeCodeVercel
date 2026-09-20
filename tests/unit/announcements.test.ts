import { describe, expect, test } from 'vitest'
import { MAX_BODY_LENGTH, MAX_TITLE_LENGTH, badgeLabel, countUnread, excerptOf, validateAnnouncement } from '@/features/announcements/text'

describe('excerptOf', () => {
  test('마크다운 기호를 걷어낸다', () => {
    expect(excerptOf('# 제목\n\n**굵게**와 _기울임_, [링크](https://a.com)와 `코드`')).toBe('제목 굵게와 기울임, 링크와 코드')
    expect(excerptOf('- 첫째\n- 둘째\n1. 셋째\n> 인용')).toBe('첫째 둘째 셋째 인용')
  })
  test('단어 안의 밑줄과 별표는 지우지 않는다 (snake_case, __init__, 2*3)', () => {
    expect(excerptOf('window.__xss 와 my_var_name 그리고 __init__ 함수')).toBe('window.__xss 와 my_var_name 그리고 init 함수')
    expect(excerptOf('파일 my_file_v2.pdf 를 확인')).toBe('파일 my_file_v2.pdf 를 확인')
    expect(excerptOf('~~취소선~~ 과 __굵게__ 와 _기울임_.')).toBe('취소선 과 굵게 와 기울임.')
  })
  test('코드 블록과 이미지는 제외한다', () => {
    expect(excerptOf('앞\n```js\nalert(1)\n```\n뒤 ![그림](https://x/y.png) 끝')).toBe('앞 뒤 끝')
  })
  test('길이를 제한하고 말줄임표를 붙인다', () => {
    const out = excerptOf('가'.repeat(300), 100)
    expect(out).toHaveLength(101)
    expect(out.endsWith('…')).toBe(true)
    expect(excerptOf('짧은 글', 100)).toBe('짧은 글')
    expect(excerptOf('')).toBe('')
  })
})

describe('countUnread / badgeLabel', () => {
  test('읽은 공지를 제외한 개수', () => {
    expect(countUnread(['a', 'b', 'c'], ['b'])).toBe(2)
    expect(countUnread(['a', 'b'], [])).toBe(2)
    expect(countUnread([], ['x'])).toBe(0)
    expect(countUnread(['a'], new Set(['a', 'zzz']))).toBe(0) // 목록에 없는 읽음 기록은 무시
  })
  test('배지 문구', () => {
    expect(badgeLabel(0)).toBeNull()
    expect(badgeLabel(-1)).toBeNull()
    expect(badgeLabel(7)).toBe('7')
    expect(badgeLabel(99)).toBe('99')
    expect(badgeLabel(100)).toBe('99+')
  })
})

describe('validateAnnouncement', () => {
  test('정상/빈 값/길이 제한', () => {
    expect(validateAnnouncement({ title: '공지', body: '내용' })).toBeNull()
    expect(validateAnnouncement({ title: '  ', body: '내용' })).toContain('제목')
    expect(validateAnnouncement({ title: '공지', body: ' \n ' })).toContain('내용')
    expect(validateAnnouncement({ title: 'a'.repeat(MAX_TITLE_LENGTH + 1), body: 'x' })).toContain('제목은')
    expect(validateAnnouncement({ title: 'a', body: 'x'.repeat(MAX_BODY_LENGTH + 1) })).toContain('내용은')
    expect(validateAnnouncement({ title: 'a'.repeat(MAX_TITLE_LENGTH), body: 'x'.repeat(MAX_BODY_LENGTH) })).toBeNull()
  })
})
