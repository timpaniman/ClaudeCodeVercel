// Design Ref: §4.2 POST /api/admin/publish — 브라우저에서 공개/게시 + 알림을 요청하는 클라이언트와 결과 키.
// 문구는 언어별 문구 파일(admin.notice.*)에 있고, 이 파일은 상태를 키로만 다룬다.
import { apiErrorKey, type ClientApiErrorCode } from '@/lib/api/clientErrors'

export type NotificationStatus = 'not_requested' | 'not_configured' | 'already_queued' | 'sent' | 'partial' | 'none'

export interface NotificationResult {
  status: NotificationStatus
  sent?: number
  failed?: number
}

/** 실패 종류: 'network' = 연결 오류, 그 밖에는 API 오류 코드('generic' 포함). 화면이 현재 언어로 번역한다 */
export type PublishFailure = 'network' | ClientApiErrorCode | 'generic'

export type PublishResult = { ok: true; notification: NotificationResult } | { ok: false; error: PublishFailure }

export async function publishWithNotify(kind: 'resource' | 'announcement', id: string, notify: boolean): Promise<PublishResult> {
  try {
    const res = await fetch('/api/admin/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id, notify }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: apiErrorKey(json) }
    return { ok: true, notification: (json?.notification ?? { status: 'not_requested' }) as NotificationResult }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export type NoticeKey = 'notConfigured' | 'alreadyQueued' | 'none' | 'sent' | 'partialCounts' | 'partialUnknown'

/** 알림 결과 → 문구 키(admin.notice.<key>)와 자리표시자 값. 알림을 요청하지 않았으면 null */
export function noticeOf(n: NotificationResult): { key: NoticeKey; sent: number; failed: number } | null {
  const sent = n.sent ?? 0
  const failed = n.failed ?? 0
  switch (n.status) {
    case 'not_requested':
      return null
    case 'not_configured':
      return { key: 'notConfigured', sent, failed }
    case 'already_queued':
      return { key: 'alreadyQueued', sent, failed }
    case 'none':
      return { key: 'none', sent, failed }
    case 'sent':
      return { key: 'sent', sent, failed }
    case 'partial':
      return { key: failed > 0 || sent > 0 ? 'partialCounts' : 'partialUnknown', sent, failed }
  }
}

const QUERY_STATUSES: NotificationStatus[] = ['not_configured', 'already_queued', 'sent', 'partial', 'none']

/** 목록 화면으로 돌아갈 때 붙이는 결과 쿼리 (?n=sent&s=12&f=0). 문구가 아니라 코드와 숫자만 싣는다 */
export function noticeQuery(n: NotificationResult): string {
  if (n.status === 'not_requested') return ''
  const sp = new URLSearchParams({ n: n.status })
  if (n.sent) sp.set('s', String(n.sent))
  if (n.failed) sp.set('f', String(n.failed))
  return `?${sp.toString()}`
}

/** 목록 화면이 쿼리에서 결과를 복원한다 (허용된 코드와 숫자만 받는다). 없으면 null */
export function noticeFromParams(sp: { n?: string; s?: string; f?: string }): NotificationResult | null {
  if (!QUERY_STATUSES.includes(sp.n as NotificationStatus)) return null
  const num = (v?: string) => (v && /^\d{1,5}$/.test(v) ? Number(v) : 0)
  return { status: sp.n as NotificationStatus, sent: num(sp.s), failed: num(sp.f) }
}
