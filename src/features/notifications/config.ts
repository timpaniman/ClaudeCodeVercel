// Design Ref: §7.3 — 알림 설정(환경변수)을 읽는다. 필요한 값이 하나라도 없으면 null → 알림 기능은 "미설정" 상태로 동작한다.
import { createLogProvider, createResendProvider, type EmailProvider } from './provider'

export interface NotificationConfig {
  provider: EmailProvider
  /** 메일 속 링크의 기준 주소 (끝의 / 제거) */
  siteUrl: string
  hmacSecret: string
}

type Env = Record<string, string | undefined>

export function loadNotificationConfig(env: Env = process.env): NotificationConfig | null {
  const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '')
  const hmacSecret = (env.UNSUBSCRIBE_HMAC_SECRET ?? '').trim()
  if (!/^https?:\/\/.+/.test(siteUrl) || hmacSecret.length < 16) return null

  // 로그 발송기는 개발에서만: 운영에서 실수로 켜져도 메일이 조용히 사라지지 않게 막는다
  if (env.EMAIL_PROVIDER === 'log') {
    if (env.NODE_ENV === 'production') return null
    return { provider: createLogProvider(), siteUrl, hmacSecret }
  }

  const apiKey = (env.RESEND_API_KEY ?? '').trim()
  const from = (env.EMAIL_FROM ?? '').trim()
  if (!apiKey || !from) return null
  // 운영 메일의 링크는 https 여야 한다
  if (env.NODE_ENV === 'production' && !siteUrl.startsWith('https://')) return null
  return { provider: createResendProvider({ apiKey, from }), siteUrl, hmacSecret }
}

export const isNotificationConfigured = (env: Env = process.env): boolean => loadNotificationConfig(env) !== null
