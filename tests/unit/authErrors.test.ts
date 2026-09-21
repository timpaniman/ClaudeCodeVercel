import { describe, expect, test } from 'vitest'
import { loginQueryError, mapAuthError } from '@/features/auth/authErrors'
import en from '@/messages/en.json'
import ko from '@/messages/ko.json'

// mapAuthError / loginQueryError 는 문구가 아니라 "키"를 돌려준다. 키가 언어별 문구 파일에 실제로 있는지도 함께 확인한다.
describe('mapAuthError', () => {
  test('발송 한도 → 잠시 후 다시', () => {
    expect(mapAuthError({ code: 'over_email_send_rate_limit', status: 429 }, 'send')).toBe('rateLimitSend')
    expect(mapAuthError({ message: 'Request rate limit reached' }, 'verify')).toBe('rateLimitVerify')
  })

  test('잘못된/주소 오류', () => {
    expect(mapAuthError({ code: 'email_address_invalid' }, 'send')).toBe('emailInvalid')
    expect(mapAuthError({ message: 'Email address "x" is invalid' }, 'send')).toBe('emailInvalid')
    expect(mapAuthError({ code: 'email_address_not_authorized' }, 'send')).toBe('emailNotAuthorized')
    expect(mapAuthError({ code: 'signup_disabled' }, 'send')).toBe('signupDisabled')
  })

  test('코드 확인 단계: 만료 / 불일치', () => {
    expect(mapAuthError({ code: 'otp_expired', status: 403 }, 'verify')).toBe('codeExpired')
    expect(mapAuthError({ message: 'Token has expired or is invalid', status: 403 }, 'verify')).toBe('codeExpired')
    expect(mapAuthError({ message: 'Token is invalid', status: 400 }, 'verify')).toBe('codeInvalid')
  })

  test('알 수 없는 오류는 내부 메시지를 노출하지 않는다 (일반 키만 돌려준다)', () => {
    expect(mapAuthError({ message: 'relation "profiles" does not exist', status: 500 }, 'send')).toBe('unknown')
  })

  test('돌려줄 수 있는 모든 키가 영어·한국어 문구에 있다', () => {
    const keys = ['rateLimitSend', 'rateLimitVerify', 'signupDisabled', 'emailInvalid', 'emailNotAuthorized', 'codeExpired', 'codeInvalid', 'unknown'] as const
    for (const k of keys) {
      expect(en.auth.errors[k]).toBeTruthy()
      expect(ko.auth.errors[k]).toBeTruthy()
    }
    // 내부 이름이 화면 문구로 새지 않는다
    expect(en.auth.errors.unknown).not.toContain('profiles')
  })
})

describe('loginQueryError', () => {
  test('알려진 코드만 키로 바꾼다', () => {
    expect(loginQueryError('link_invalid')).toBe('linkInvalid')
    expect(loginQueryError('no_profile')).toBe('noProfile')
    expect(loginQueryError('auth_failed')).toBe('authFailed')
    expect(loginQueryError('<script>')).toBeNull()
    expect(loginQueryError(undefined)).toBeNull()
  })

  test('키가 영어·한국어 문구에 있다', () => {
    for (const k of ['linkInvalid', 'authFailed', 'noProfile'] as const) {
      expect(en.auth.linkErrors[k]).toBeTruthy()
      expect(ko.auth.linkErrors[k]).toBeTruthy()
    }
  })
})
