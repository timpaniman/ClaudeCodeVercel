// Design Ref: §6 — Supabase Auth 오류를 사용자용 문구의 "키"로 바꾼다. 내부 오류 상세는 노출하지 않는다.
// 문장은 언어별 문구 파일(src/messages)의 auth.errors / auth.linkErrors 에 있고, 화면이 현재 언어로 번역한다.
export interface AuthErrorLike {
  message?: string
  status?: number
  code?: string
}

export type AuthStep = 'send' | 'verify'

export type AuthErrorKey =
  | 'rateLimitSend'
  | 'rateLimitVerify'
  | 'signupDisabled'
  | 'emailInvalid'
  | 'emailNotAuthorized'
  | 'codeExpired'
  | 'codeInvalid'
  | 'unknown'

export function mapAuthError(error: AuthErrorLike, step: AuthStep): AuthErrorKey {
  const code = error.code ?? ''
  const msg = (error.message ?? '').toLowerCase()

  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error.status === 429 || msg.includes('rate limit')) {
    return step === 'send' ? 'rateLimitSend' : 'rateLimitVerify'
  }
  if (code === 'signup_disabled') return 'signupDisabled'

  if (step === 'send') {
    // "Email address … is invalid" 처럼 이메일 형식 오류는 코드 발송 단계에서만 해당한다.
    if (code === 'email_address_invalid' || msg.includes('is invalid')) return 'emailInvalid'
    if (code === 'email_address_not_authorized') return 'emailNotAuthorized'
  } else {
    // "Token has expired or is invalid" 는 만료를 먼저 판별한다.
    if (code === 'otp_expired' || msg.includes('expired')) return 'codeExpired'
    if (code === 'otp_disabled' || msg.includes('invalid') || msg.includes('token') || error.status === 400 || error.status === 401 || error.status === 403) {
      return 'codeInvalid'
    }
  }
  return 'unknown'
}

export type LoginQueryErrorKey = 'linkInvalid' | 'authFailed' | 'noProfile'

/** /login?error=… 쿼리로 넘어온 오류 코드 → 문구 키 (알려진 코드만) */
export function loginQueryError(code: string | undefined): LoginQueryErrorKey | null {
  switch (code) {
    case 'link_invalid':
      return 'linkInvalid'
    case 'auth_failed':
      return 'authFailed'
    case 'no_profile':
      return 'noProfile'
    default:
      return null
  }
}
