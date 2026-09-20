// Design Ref: §4.2 /api/cron/notify 처리 규칙 — 큐(notification_jobs)의 작업을 가져와 수신자에게 발송하고 결과를 기록한다.
// 저장소(DB)와 발송기(Resend)를 주입받는 Application 계층이다. 그래서 실제 메일 없이도 재시도·중복 방지를 테스트할 수 있다.
//
// 멱등성: 이미 발송한 사람은 store.recipients 가 제외하므로 같은 작업을 다시 실행해도 중복 발송되지 않는다.
// 재시도: 실패한 사람이 있으면 작업이 failed 가 되고, MAX_ATTEMPTS 번까지 다음 실행에서 실패한 사람에게만 다시 보낸다.
import type { EmailMessage, EmailProvider, SendOutcome } from './provider'
import { buildAnnouncementEmail, buildResourceEmail, type EmailContent } from './templates'
import { signUnsubscribeToken } from './unsubscribe'

export const MAX_ATTEMPTS = 5
export const STALE_PROCESSING_MS = 10 * 60 * 1000

export type JobKind = 'resource' | 'announcement'

export interface JobRecord {
  id: string
  kind: JobKind
  ref_id: string
  /** 이번 실행을 포함한 시도 횟수 */
  attempts: number
}

export interface Recipient {
  user_id: string
  email: string
  name: string
}

export type Subject =
  | { kind: 'resource'; id: string; title: string; cohortLabel: string; categoryLabel: string }
  | { kind: 'announcement'; id: string; title: string; excerpt: string }

export interface DeliveryRow {
  user_id: string
  status: 'sent' | 'failed'
  provider_id?: string | null
  error?: string | null
}

export interface NotificationStore {
  /** 처리할 작업을 다른 실행과 겹치지 않게 선점한다 */
  claimJobs(opts: { jobId?: string; limit: number }): Promise<JobRecord[]>
  /** 알림의 대상. 없어졌거나 공개되지 않았으면 null (발송하지 않는다) */
  loadSubject(job: JobRecord): Promise<Subject | null>
  /** 아직 발송되지 않은 수신자 (수신 동의 + 열람 권한 있음) */
  recipients(job: JobRecord): Promise<Recipient[]>
  recordDeliveries(jobId: string, rows: DeliveryRow[]): Promise<void>
  finishJob(jobId: string, result: { status: 'done' | 'failed'; error?: string | null }): Promise<void>
}

export interface ProcessOptions {
  store: NotificationStore
  provider: EmailProvider
  siteUrl: string
  hmacSecret: string
  /** 특정 작업만 처리 (발행 직후) */
  jobId?: string
  maxJobs?: number
  /** 배치 사이 대기 (발송 속도 제한 준수). 테스트에서는 0 */
  chunkDelayMs?: number
  sleep?: (ms: number) => Promise<void>
}

export interface JobSummary {
  jobId: string
  kind: JobKind
  recipients: number
  sent: number
  failed: number
  status: 'done' | 'failed'
  note?: string
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function buildContent(subject: Subject, recipient: Recipient, siteUrl: string, unsubscribeUrl: string): EmailContent {
  if (subject.kind === 'resource') {
    return buildResourceEmail({
      name: recipient.name, title: subject.title, cohortLabel: subject.cohortLabel, categoryLabel: subject.categoryLabel,
      url: `${siteUrl}/library/${subject.id}`, unsubscribeUrl,
    })
  }
  return buildAnnouncementEmail({
    name: recipient.name, title: subject.title, excerpt: subject.excerpt,
    url: `${siteUrl}/announcements/${subject.id}`, unsubscribeUrl,
  })
}

export function buildMessage(job: JobRecord, subject: Subject, recipient: Recipient, opts: { siteUrl: string; hmacSecret: string }): EmailMessage {
  const token = signUnsubscribeToken(opts.hmacSecret, { u: recipient.user_id, s: job.kind })
  const content = buildContent(subject, recipient, opts.siteUrl, `${opts.siteUrl}/unsubscribe?t=${token}`)
  return {
    to: recipient.email,
    ...content,
    headers: {
      // 메일 앱의 "구독 취소" 버튼(원클릭)이 쓰는 헤더
      'List-Unsubscribe': `<${opts.siteUrl}/api/unsubscribe?t=${token}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    idempotencyKey: `${job.id}:${recipient.user_id}`,
  }
}

export async function processNotificationJobs(opts: ProcessOptions): Promise<JobSummary[]> {
  const jobs = await opts.store.claimJobs({ jobId: opts.jobId, limit: opts.maxJobs ?? 20 })
  const summaries: JobSummary[] = []
  for (const job of jobs) summaries.push(await processOne(job, opts))
  return summaries
}

async function processOne(job: JobRecord, opts: ProcessOptions): Promise<JobSummary> {
  const { store, provider } = opts
  const sleep = opts.sleep ?? defaultSleep
  const base = { jobId: job.id, kind: job.kind }

  try {
    const subject = await store.loadSubject(job)
    if (!subject) {
      const note = '대상이 없어졌거나 공개되지 않아 발송하지 않았습니다.'
      await store.finishJob(job.id, { status: 'done', error: note })
      return { ...base, recipients: 0, sent: 0, failed: 0, status: 'done', note }
    }

    const recipients = await store.recipients(job)
    let sent = 0
    let failed = 0
    const errors = new Set<string>()

    const groups = chunks(recipients, provider.maxBatch)
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi]
      const messages = group.map((r) => buildMessage(job, subject, r, opts))

      let outcomes: SendOutcome[]
      try {
        outcomes = await provider.sendBatch(messages)
      } catch (e) {
        outcomes = messages.map(() => ({ ok: false as const, error: `발송기 오류: ${e instanceof Error ? e.message : String(e)}`, retryable: true }))
      }
      if (outcomes.length !== group.length) {
        outcomes = group.map(() => ({ ok: false as const, error: '발송 결과 개수가 맞지 않습니다.', retryable: true }))
      }

      const rows: DeliveryRow[] = group.map((r, i) => {
        const o = outcomes[i]
        if (o.ok) return { user_id: r.user_id, status: 'sent', provider_id: o.id }
        errors.add(o.error)
        return { user_id: r.user_id, status: 'failed', error: o.error.slice(0, 500) }
      })
      await store.recordDeliveries(job.id, rows)
      sent += rows.filter((r) => r.status === 'sent').length
      failed += rows.filter((r) => r.status === 'failed').length

      if (gi < groups.length - 1) await sleep(opts.chunkDelayMs ?? 600)
    }

    if (failed === 0) {
      await store.finishJob(job.id, { status: 'done', error: null })
      return { ...base, recipients: recipients.length, sent, failed, status: 'done' }
    }
    const note = `${failed}명 발송 실패 (${Array.from(errors).slice(0, 2).join(' / ')})${job.attempts >= MAX_ATTEMPTS ? ' — 재시도 한도 도달' : ''}`
    await store.finishJob(job.id, { status: 'failed', error: note.slice(0, 500) })
    return { ...base, recipients: recipients.length, sent, failed, status: 'failed', note }
  } catch (e) {
    const note = `처리 중 오류: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500)
    try {
      await store.finishJob(job.id, { status: 'failed', error: note })
    } catch {
      /* 다음 실행에서 stale 작업으로 회수된다 */
    }
    return { ...base, recipients: 0, sent: 0, failed: 0, status: 'failed', note }
  }
}
