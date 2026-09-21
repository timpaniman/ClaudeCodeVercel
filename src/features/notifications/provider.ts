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

export interface SendBatchOptions {
  deadlineAt?: number
}

export type SendOutcome = { ok: true; id: string | null } | { ok: false; error: string; retryable: boolean }

export interface EmailProvider {
  readonly name: 'resend' | 'log'
  /** 한 번에 보낼 수 있는 최대 건수 */
  readonly maxBatch: number
  /**
   * 입력과 같은 길이·같은 순서로 결과를 돌려준다 (예외를 던지지 않는다).
   * deadlineAt(epoch ms)을 넘기면 문제 주소를 골라내는 중이라도 그 시각 이후에는 새 요청을 보내지 않고
   * 남은 메시지를 "재시도 가능한 실패"로 돌려준다 (Vercel 함수 시간 제한 안에서 끝내기 위함).
   */
  sendBatch(messages: EmailMessage[], opts?: SendBatchOptions): Promise<SendOutcome[]>
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
      return { ok: false, error: `Network error: ${e instanceof Error ? e.message : String(e)}`, retryable: true }
    }
  }

  type BatchAttempt = { outcomes: SendOutcome[] } | { lastError: { status: number; body: unknown } | null }

  /** 배치 한 번 발송. 일시 오류(429·5xx·네트워크)는 최대 3번까지 점점 길게 기다리며 재시도한다 */
  async function batchWithRetry(messages: EmailMessage[]): Promise<BatchAttempt> {
    let lastError: { status: number; body: unknown } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await doFetch(`${RESEND_API}/emails/batch`, { method: 'POST', headers, body: JSON.stringify(messages.map(payload)) })
        const body = await res.json().catch(() => null)
        if (res.ok && Array.isArray(body?.data) && body.data.length === messages.length) {
          return { outcomes: body.data.map((d: { id?: string }) => ({ ok: true as const, id: d?.id ?? null })) }
        }
        if (res.ok) return { outcomes: await Promise.all(messages.map(sendOne)) } // 응답 형식이 예상과 다르면 건별 재확인
        lastError = { status: res.status, body }
        if (!isRetryableStatus(res.status)) break
      } catch (e) {
        lastError = { status: 0, body: { message: e instanceof Error ? e.message : String(e) } }
      }
      await sleep(500 * 2 ** attempt)
    }
    return { lastError }
  }

  /** 4xx(429 제외) = 요청 내용이 잘못됨(보통 주소 하나). 다시 보내도 소용없으니 원인을 찾아야 한다 */
  const isValidationRejection = (e: { status: number } | null) => !!e && e.status >= 400 && e.status < 500 && e.status !== 429

  const retryableFailure = (messages: EmailMessage[], error: string): SendOutcome[] => messages.map(() => ({ ok: false as const, error, retryable: true }))

  /**
   * 배치가 검증 오류로 거절됐을 때: 메시지를 반씩 나누어 다시 배치로 보내며 문제 메시지만 골라낸다.
   * 100통 중 1통이 문제면 요청이 약 15번(하나씩 100번이 아님)이라 함수 시간 제한 안에 끝난다.
   */
  async function isolate(messages: EmailMessage[], deadlineAt?: number): Promise<SendOutcome[]> {
    if (messages.length === 1) return [await sendOne(messages[0])]
    const mid = Math.ceil(messages.length / 2)
    const out: SendOutcome[] = []
    for (const half of [messages.slice(0, mid), messages.slice(mid)]) {
      if (deadlineAt !== undefined && Date.now() >= deadlineAt) {
        out.push(...retryableFailure(half, 'Not sent in this run because of the time limit (will continue in the next run)'))
        continue
      }
      await sleep(550) // Resend 기본 한도(초당 2건) 이하로 유지
      if (half.length === 1) {
        out.push(await sendOne(half[0]))
        continue
      }
      const r = await batchWithRetry(half)
      if ('outcomes' in r) out.push(...r.outcomes)
      else if (isValidationRejection(r.lastError)) out.push(...(await isolate(half, deadlineAt)))
      else out.push(...retryableFailure(half, r.lastError ? errorText(r.lastError.status, r.lastError.body) : 'Unknown error'))
    }
    return out
  }

  return {
    name: 'resend',
    maxBatch: 100,
    async sendBatch(messages, options) {
      if (messages.length === 0) return []
      const first = await batchWithRetry(messages)
      if ('outcomes' in first) return first.outcomes
      if (isValidationRejection(first.lastError)) return isolate(messages, options?.deadlineAt)
      // 서버·네트워크 문제: 전원 "재시도 가능한 실패"로 돌려 다음 실행에서 이어 보낸다
      return retryableFailure(messages, first.lastError ? errorText(first.lastError.status, first.lastError.body) : 'Unknown error')
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
