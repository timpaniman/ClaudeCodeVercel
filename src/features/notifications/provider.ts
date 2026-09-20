// Design Ref: §2.4 — 이메일 발송기. Resend(운영)와 로그 출력(개발 전용) 두 가지를 같은 인터페이스로 쓴다.
// Infrastructure 계층: 외부 서비스 호출만 담당하고 알림 규칙(누구에게, 몇 번)은 process.ts 가 정한다.
export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
  /** 같은 요청을 재시도해도 한 번만 발송되도록 하는 키 (Resend Idempotency-Key) */
  idempotencyKey?: string
}

export type SendOutcome = { ok: true; id: string | null } | { ok: false; error: string; retryable: boolean }

export interface EmailProvider {
  readonly name: 'resend' | 'log'
  /** 한 번에 보낼 수 있는 최대 건수 */
  readonly maxBatch: number
  /** 입력과 같은 길이·같은 순서로 결과를 돌려준다 (예외를 던지지 않는다) */
  sendBatch(messages: EmailMessage[]): Promise<SendOutcome[]>
}

const RESEND_API = 'https://api.resend.com'

interface ResendOptions {
  apiKey: string
  /** 예: `AI4CEO <noreply@mail.example.com>` */
  from: string
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const isRetryableStatus = (status: number) => status === 429 || status >= 500

function errorText(status: number, body: unknown): string {
  const msg = typeof body === 'object' && body !== null && 'message' in body ? String((body as { message: unknown }).message) : ''
  return `HTTP ${status}${msg ? `: ${msg.slice(0, 200)}` : ''}`
}

export function createResendProvider(opts: ResendOptions): EmailProvider {
  const doFetch = opts.fetchImpl ?? fetch
  const sleep = opts.sleep ?? defaultSleep
  const headers = { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' }

  const payload = (m: EmailMessage) => ({ from: opts.from, to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers })

  async function sendOne(m: EmailMessage): Promise<SendOutcome> {
    try {
      const res = await doFetch(`${RESEND_API}/emails`, {
        method: 'POST',
        headers: m.idempotencyKey ? { ...headers, 'Idempotency-Key': m.idempotencyKey } : headers,
        body: JSON.stringify(payload(m)),
      })
      const body = await res.json().catch(() => null)
      if (res.ok) return { ok: true, id: typeof body?.id === 'string' ? body.id : null }
      return { ok: false, error: errorText(res.status, body), retryable: isRetryableStatus(res.status) }
    } catch (e) {
      return { ok: false, error: `네트워크 오류: ${e instanceof Error ? e.message : String(e)}`, retryable: true }
    }
  }

  return {
    name: 'resend',
    maxBatch: 100,
    async sendBatch(messages) {
      if (messages.length === 0) return []

      // 1) 배치 발송 (일시 오류는 최대 3번까지 점점 길게 기다리며 재시도)
      let lastError: { status: number; body: unknown } | null = null
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await doFetch(`${RESEND_API}/emails/batch`, { method: 'POST', headers, body: JSON.stringify(messages.map(payload)) })
          const body = await res.json().catch(() => null)
          if (res.ok && Array.isArray(body?.data) && body.data.length === messages.length) {
            return body.data.map((d: { id?: string }) => ({ ok: true as const, id: d?.id ?? null }))
          }
          if (res.ok) return await Promise.all(messages.map(sendOne)) // 응답 형식이 예상과 다르면 건별 재확인
          lastError = { status: res.status, body }
          if (!isRetryableStatus(res.status)) break
        } catch (e) {
          lastError = { status: 0, body: { message: e instanceof Error ? e.message : String(e) } }
        }
        await sleep(500 * 2 ** attempt)
      }

      // 2) 배치가 검증 오류(4xx)로 거절되면 한 명의 문제로 전체가 막히지 않도록 건별로 나누어 보낸다
      if (lastError && lastError.status >= 400 && lastError.status < 500 && lastError.status !== 429) {
        const out: SendOutcome[] = []
        for (const m of messages) {
          out.push(await sendOne(m))
          await sleep(550) // Resend 기본 한도(초당 2건) 이하로 유지
        }
        return out
      }

      // 3) 서버·네트워크 문제: 전원 "재시도 가능한 실패"로 돌려 다음 실행에서 이어 보낸다
      const error = lastError ? errorText(lastError.status, lastError.body) : '알 수 없는 오류'
      return messages.map(() => ({ ok: false as const, error, retryable: true }))
    },
  }
}

/** 개발 전용: 메일을 보내지 않고 서버 로그에 남긴다 (운영에서는 만들어지지 않는다) */
export function createLogProvider(log: (line: string) => void = console.log): EmailProvider {
  let n = 0
  return {
    name: 'log',
    maxBatch: 100,
    async sendBatch(messages) {
      return messages.map((m) => {
        n += 1
        log(`[email:log] to=${m.to} subject=${JSON.stringify(m.subject)}\n${m.text}`)
        return { ok: true as const, id: `log-${n}` }
      })
    },
  }
}
