// Design Ref: §6 — Supabase Auth 오류를 사용자용 존댓말 문구로 바꾼다. 내부 오류 상세는 노출하지 않는다.
export interface AuthErrorLike {
  message?: string
  status?: number
  code?: string
}

export type AuthStep = 'send' | 'verify'

export function mapAuthError(error: AuthErrorLike, step: AuthStep): string {
  const code = error.code ?? ''
  const msg = (error.message ?? '').toLowerCase()

  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error.status === 429 || msg.includes('rate limit')) {
    return step === 'send'
      ? '메일 발송 횟수 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.'
      : '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
  }
  if (code === 'signup_disabled') return '현재 가입이 제한되어 있습니다. 운영진에게 문의해 주세요.'

  if (step === 'send') {
    // "Email address … is invalid" 처럼 이메일 형식 오류는 코드 발송 단계에서만 해당한다.
    if (code === 'email_address_invalid' || msg.includes('is invalid')) return '이메일 주소를 확인해 주세요.'
    if (code === 'email_address_not_authorized') return '이 주소로는 메일을 보낼 수 없습니다. 운영진에게 문의해 주세요.'
  } else {
    // "Token has expired or is invalid" 는 만료를 먼저 판별한다.
    if (code === 'otp_expired' || msg.includes('expired')) return '코드가 만료되었습니다. 새 코드를 받아 주세요.'
    if (code === 'otp_disabled' || msg.includes('invalid') || msg.includes('token') || error.status === 400 || error.status === 401 || error.status === 403) {
      return '코드가 올바르지 않습니다. 메일의 코드를 다시 확인해 주세요.'
    }
  }
  return '일시적인 오류입니다. 잠시 후 다시 시도해 주세요.'
}

/** /login?error=… 쿼리로 넘어온 오류 코드 → 안내 문구 */
export function loginQueryError(code: string | undefined): string | null {
  switch (code) {
    case 'link_invalid':
      return '로그인 링크가 만료되었거나 이미 사용되었습니다. 코드를 다시 받아 주세요.'
    case 'auth_failed':
      return '로그인에 실패했습니다. 다시 시도해 주세요.'
    case 'no_profile':
      return '계정 정보를 불러오지 못했습니다. 다시 로그인해 주세요. 계속되면 운영진에게 문의해 주세요.'
    default:
      return null
  }
}
