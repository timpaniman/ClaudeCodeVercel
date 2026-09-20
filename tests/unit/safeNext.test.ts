import { describe, expect, test } from 'vitest'
import { safeNext } from '@/lib/auth/safeNext'

describe('safeNext — open redirect 방지', () => {
  test.each([
    ['/library/abc', '/library/abc'],
    ['/announcements?x=1', '/announcements?x=1'],
    ['/admin/roster', '/admin/roster'],
  ])('내부 경로 %s 는 그대로 허용', (input, expected) => {
    expect(safeNext(input)).toBe(expected)
  })

  test.each([
    ['https://evil.com', '외부 URL'],
    ['//evil.com', '프로토콜 상대 URL'],
    ['/\\evil.com', '역슬래시 우회'],
    ['javascript:alert(1)', 'javascript 스킴'],
    ['home', '슬래시로 시작하지 않음'],
    ['/ok\r\nSet-Cookie: a=b', '헤더 주입(제어문자)'],
    ['/login', '로그인 루프'],
    ['/login?next=/x', '로그인 루프(쿼리)'],
    ['/auth/callback', '인증 경로 루프'],
    ['/' + 'a'.repeat(600), '너무 긴 값'],
  ])('%s → 기본값(/home) (%s)', (input) => {
    expect(safeNext(input)).toBe('/home')
  })

  test('null/undefined/빈 문자열은 기본값', () => {
    expect(safeNext(null)).toBe('/home')
    expect(safeNext(undefined)).toBe('/home')
    expect(safeNext('')).toBe('/home')
  })

  test('기본값을 지정할 수 있다', () => {
    expect(safeNext('https://evil.com', '/library')).toBe('/library')
  })
})
