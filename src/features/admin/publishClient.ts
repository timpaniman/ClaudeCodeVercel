// Design Ref: §4.2 POST /api/admin/publish — 브라우저에서 공개/게시 + 알림을 요청하는 클라이언트와 결과 문구.
export type NotificationStatus = 'not_requested' | 'not_configured' | 'already_queued' | 'sent' | 'partial' | 'none'

export interface NotificationResult {
  status: NotificationStatus
  sent?: number
  failed?: number
}

export type PublishResult = { ok: true; notification: NotificationResult } | { ok: false; error: string }

export async function publishWithNotify(kind: 'resource' | 'announcement', id: string, notify: boolean): Promise<PublishResult> {
  try {
    const res = await fetch('/api/admin/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id, notify }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: json?.error?.message ?? '공개하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
    return { ok: true, notification: (json?.notification ?? { status: 'not_requested' }) as NotificationResult }
  } catch {
    return { ok: false, error: '네트워크 오류입니다. 연결을 확인하고 다시 시도해 주세요.' }
  }
}

/** 알림 결과를 사람이 읽는 문구로. 알림을 요청하지 않았으면 null */
export function describeNotification(n: NotificationResult): string | null {
  const sent = n.sent ?? 0
  const failed = n.failed ?? 0
  switch (n.status) {
    case 'not_requested':
      return null
    case 'not_configured':
      return '이메일 서비스가 아직 설정되지 않아 알림은 대기 중입니다. 설정이 끝나면 자동으로 발송됩니다.'
    case 'already_queued':
      return '이미 알림이 요청된 항목이라 다시 보내지 않았습니다.'
    case 'none':
      return '알림을 받을 대상이 없습니다.'
    case 'sent':
      return `${sent}명에게 알림 메일을 보냈습니다.`
    case 'partial':
      return failed > 0 || sent > 0
        ? `${sent}명에게 보냈고 ${failed}명은 실패했습니다. 실패한 분께는 자동으로 다시 시도합니다.`
        : '알림 발송을 끝내지 못했습니다. 자동으로 다시 시도합니다.'
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

/** 목록 화면이 쿼리에서 결과 문구를 복원한다 (허용된 코드와 숫자만 받는다) */
export function noticeFromParams(sp: { n?: string; s?: string; f?: string }): string | null {
  if (!QUERY_STATUSES.includes(sp.n as NotificationStatus)) return null
  const num = (v?: string) => (v && /^\d{1,5}$/.test(v) ? Number(v) : 0)
  return describeNotification({ status: sp.n as NotificationStatus, sent: num(sp.s), failed: num(sp.f) })
}
