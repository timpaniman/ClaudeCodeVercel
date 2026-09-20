import { describe, expect, test } from 'vitest'
import { isSupabaseConfigured, isValidSupabaseUrl } from '@/lib/supabase/config'

describe('isValidSupabaseUrl', () => {
  test.each([
    'https://abcdefghijklmnopqrst.supabase.co',
    'https://abcdefghijklmnopqrst.supabase.co/',
    'http://localhost:54321',
    'http://127.0.0.1:54321',
  ])('%s 는 유효', (u) => expect(isValidSupabaseUrl(u)).toBe(true))

  test.each([
    ['프로젝트 ID 만 입력', 'abcdefghijklmnopqrst'],
    ['호스트만 입력(프로토콜 없음)', 'abcdefghijklmnopqrst.supabase.co'],
    ['빈 문자열', ''],
    ['자리표시자', 'your-supabase-url'],
    ['http 원격 주소', 'http://abcdefghijklmnopqrst.supabase.co'],
    ['javascript 스킴', 'javascript:alert(1)'],
  ])('%s → 무효', (_n, u) => expect(isValidSupabaseUrl(u)).toBe(false))

  test('undefined', () => expect(isValidSupabaseUrl(undefined)).toBe(false))
})

describe('isSupabaseConfigured', () => {
  const url = 'https://abcdefghijklmnopqrst.supabase.co'
  const key = 'a'.repeat(40)
  test('주소와 키가 모두 있어야 한다', () => {
    expect(isSupabaseConfigured(url, key)).toBe(true)
    expect(isSupabaseConfigured(url, undefined)).toBe(false)
    expect(isSupabaseConfigured(url, '')).toBe(false)
    expect(isSupabaseConfigured(url, 'short')).toBe(false)
    expect(isSupabaseConfigured('abcdefghijklmnopqrst', key)).toBe(false)
  })
})
