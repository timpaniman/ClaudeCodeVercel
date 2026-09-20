// Design Ref: §4.2 /api/unsubscribe — 수신 해제 링크용 서명 토큰 (HMAC-SHA256). 로그인 없이 동작해야 하므로 토큰 자체가 권한이다.
// 토큰으로 할 수 있는 일은 "그 사용자의 알림을 끄는 것" 하나뿐이라 만료는 두지 않는다 (오래된 메일의 링크도 동작해야 한다).
import { createHmac, timingSafeEqual } from 'node:crypto'

export type UnsubscribeScope = 'resource' | 'announcement' | 'all'
export const UNSUBSCRIBE_SCOPES: readonly UnsubscribeScope[] = ['resource', 'announcement', 'all']

export interface UnsubscribePayload {
  /** 사용자 id (uuid) */
  u: string
  /** 끌 알림 종류 */
  s: UnsubscribeScope
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const b64 = (buf: Buffer) => buf.toString('base64url')
const sign = (secret: string, body: string) => createHmac('sha256', secret).update(body).digest()

export function signUnsubscribeToken(secret: string, payload: UnsubscribePayload): string {
  if (secret.length < 16) throw new Error('UNSUBSCRIBE_HMAC_SECRET 은 16자 이상이어야 합니다.')
  const body = b64(Buffer.from(JSON.stringify({ u: payload.u, s: payload.s }), 'utf8'))
  return `${body}.${b64(sign(secret, body))}`
}

/** 서명이 맞고 형식이 올바르면 payload, 아니면 null */
export function verifyUnsubscribeToken(secret: string, token: string | null | undefined): UnsubscribePayload | null {
  if (!token || secret.length < 16 || token.length > 512) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts

  const expected = sign(secret, body)
  let given: Buffer
  try {
    given = Buffer.from(sig, 'base64url')
  } catch {
    return null
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<UnsubscribePayload>
    if (typeof p.u !== 'string' || !UUID_RE.test(p.u)) return null
    if (!UNSUBSCRIBE_SCOPES.includes(p.s as UnsubscribeScope)) return null
    return { u: p.u, s: p.s as UnsubscribeScope }
  } catch {
    return null
  }
}

/** 범위에 해당하는 profiles 컬럼 변경값 */
export function unsubscribePatch(scope: UnsubscribeScope): { notify_new_resource?: false; notify_announcement?: false } {
  if (scope === 'resource') return { notify_new_resource: false }
  if (scope === 'announcement') return { notify_announcement: false }
  return { notify_new_resource: false, notify_announcement: false }
}

export const SCOPE_LABEL: Record<UnsubscribeScope, string> = {
  resource: '새 자료 알림',
  announcement: '공지 알림',
  all: '모든 알림',
}
