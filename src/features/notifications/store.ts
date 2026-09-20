// Design Ref: §3.3 notification_jobs / notification_deliveries — NotificationStore 의 Supabase(service role) 구현.
// 두 테이블은 일반 회원·운영진 모두 접근할 수 없다(005_rls.sql). 서버에서 service role 클라이언트로만 사용한다.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { excerptOf } from '@/features/announcements/text'
import { CATEGORY_LABEL } from '@/features/library/params'
import { MAX_ATTEMPTS, STALE_PROCESSING_MS, type DeliveryRow, type JobRecord, type NotificationStore, type Recipient, type Subject } from './process'

type Db = SupabaseClient<Database>

interface JobRow {
  id: string
  kind: 'resource' | 'announcement'
  ref_id: string
  attempts: number
  status: 'queued' | 'processing' | 'done' | 'failed'
  processed_at: string | null
}

/** 재시도 한도 이내의 queued/failed, 또는 오래 멈춘 processing 작업만 처리 대상이다 */
export function isClaimable(row: Pick<JobRow, 'status' | 'attempts' | 'processed_at'>, now = Date.now()): boolean {
  if (row.status === 'queued' || row.status === 'failed') return row.attempts < MAX_ATTEMPTS
  if (row.status === 'processing') {
    return row.attempts < MAX_ATTEMPTS && row.processed_at !== null && now - new Date(row.processed_at).getTime() > STALE_PROCESSING_MS
  }
  return false
}

export function createSupabaseNotificationStore(supabase: Db): NotificationStore {
  return {
    async claimJobs({ jobId, limit }) {
      let q = supabase
        .from('notification_jobs')
        .select('id, kind, ref_id, attempts, status, processed_at')
        .in('status', ['queued', 'failed', 'processing'])
        .order('created_at', { ascending: true })
        .limit(200)
      if (jobId) q = q.eq('id', jobId)
      const { data, error } = await q
      if (error) throw new Error(`notification_jobs 조회 실패: ${error.message}`)

      const claimed: JobRecord[] = []
      for (const row of (data ?? []) as JobRow[]) {
        if (claimed.length >= limit) break
        if (!isClaimable(row)) continue

        // 낙관적 선점: 내가 본 상태 그대로일 때만 processing 으로 바꾼다 (다른 실행이 먼저 잡았으면 0행)
        let upd = supabase
          .from('notification_jobs')
          .update({ status: 'processing', attempts: row.attempts + 1, processed_at: new Date().toISOString(), error: null })
          .eq('id', row.id)
          .eq('status', row.status)
          .eq('attempts', row.attempts)
        upd = row.processed_at === null ? upd.is('processed_at', null) : upd.eq('processed_at', row.processed_at)
        const { data: won, error: updErr } = await upd.select('id, kind, ref_id, attempts')
        if (updErr) throw new Error(`notification_jobs 선점 실패: ${updErr.message}`)
        if (won && won.length === 1) claimed.push(won[0] as JobRecord)
      }
      return claimed
    },

    async loadSubject(job): Promise<Subject | null> {
      if (job.kind === 'resource') {
        const { data } = await supabase
          .from('resources')
          .select('id, title, category, cohort_id, is_published')
          .eq('id', job.ref_id)
          .maybeSingle()
        if (!data || !data.is_published) return null

        let cohortLabel = '공용'
        if (data.cohort_id !== null) {
          const { data: c } = await supabase.from('cohorts').select('number').eq('id', data.cohort_id).maybeSingle()
          cohortLabel = c ? `${c.number}기` : '공용'
        }
        return { kind: 'resource', id: data.id, title: data.title, cohortLabel, categoryLabel: CATEGORY_LABEL[data.category] }
      }

      const { data } = await supabase.from('announcements').select('id, title, body, published_at').eq('id', job.ref_id).maybeSingle()
      if (!data || !data.published_at || new Date(data.published_at) > new Date()) return null
      return { kind: 'announcement', id: data.id, title: data.title, excerpt: excerptOf(data.body, 140) }
    },

    async recipients(job): Promise<Recipient[]> {
      const { data, error } = await supabase.rpc('notification_recipients', { p_kind: job.kind, p_ref: job.ref_id })
      if (error) throw new Error(`notification_recipients 실패: ${error.message}`)
      return data ?? []
    },

    async recordDeliveries(jobId, rows: DeliveryRow[]) {
      if (rows.length === 0) return
      const { error } = await supabase.from('notification_deliveries').upsert(
        rows.map((r) => ({
          job_id: jobId,
          user_id: r.user_id,
          status: r.status,
          provider_id: r.provider_id ?? null,
          error: r.error ?? null,
          sent_at: new Date().toISOString(),
        })),
        { onConflict: 'job_id,user_id' },
      )
      if (error) throw new Error(`notification_deliveries 기록 실패: ${error.message}`)
    },

    async finishJob(jobId, result) {
      const { error } = await supabase
        .from('notification_jobs')
        .update({ status: result.status, error: result.error ?? null, processed_at: new Date().toISOString() })
        .eq('id', jobId)
      if (error) throw new Error(`notification_jobs 종료 기록 실패: ${error.message}`)
    },
  }
}
