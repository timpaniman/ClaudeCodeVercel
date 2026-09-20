import { describe, expect, test } from 'vitest'
import { loginQueryError, mapAuthError } from '@/features/auth/authErrors'

describe('mapAuthError', () => {
  test('발송 한도 → 잠시 후 다시', () => {
    expect(mapAuthError({ code: 'over_email_send_rate_limit', status: 429 }, 'send')).toContain('발송 횟수 제한')
    expect(mapAuthError({ message: 'Request rate limit reached' }, 'verify')).toContain('요청이 너무 많습니다')
  })

  test('잘못된/주소 오류', () => {
    expect(mapAuthError({ code: 'email_address_invalid' }, 'send')).toBe('이메일 주소를 확인해 주세요.')
    expect(mapAuthError({ message: 'Email address "x" is invalid' }, 'send')).toBe('이메일 주소를 확인해 주세요.')
    expect(mapAuthError({ code: 'email_address_not_authorized' }, 'send')).toContain('메일을 보낼 수 없습니다')
    expect(mapAuthError({ code: 'signup_disabled' }, 'send')).toContain('가입이 제한')
  })

  test('코드 확인 단계: 만료 / 불일치', () => {
    expect(mapAuthError({ code: 'otp_expired', status: 403 }, 'verify')).toContain('만료')
    expect(mapAuthError({ message: 'Token has expired or is invalid', status: 403 }, 'verify')).toContain('만료')
    expect(mapAuthError({ message: 'Token is invalid', status: 400 }, 'verify')).toContain('올바르지 않습니다')
  })

  test('알 수 없는 오류는 내부 메시지를 노출하지 않는다', () => {
    const msg = mapAuthError({ message: 'relation "profiles" does not exist', status: 500 }, 'send')
    expect(msg).toBe('일시적인 오류입니다. 잠시 후 다시 시도해 주세요.')
    expect(msg).not.toContain('profiles')
  })
})

describe('loginQueryError', () => {
  test('알려진 코드만 문구로 바꾼다', () => {
    expect(loginQueryError('link_invalid')).toContain('링크')
    expect(loginQueryError('no_profile')).toContain('계정 정보')
    expect(loginQueryError('auth_failed')).toContain('실패')
    expect(loginQueryError('<script>')).toBeNull()
    expect(loginQueryError(undefined)).toBeNull()
  })
})
