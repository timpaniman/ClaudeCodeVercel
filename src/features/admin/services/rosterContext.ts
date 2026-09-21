// 명단 검증에 필요한 DB 상태(존재하는 기수, 이미 등록된 이메일)를 읽는다 (Infrastructure 접근, 운영진 세션 + RLS).
import type { ServerClient } from '@/lib/auth/session'
import type { ValidationContext } from './roster'

export async function loadRosterContext(supabase: ServerClient): Promise<ValidationContext> {
  const [cohorts, roster] = await Promise.all([
    supabase.from('cohorts').select('number'),
    supabase.from('roster').select('email, claimed_by').limit(20000),
  ])
  if (cohorts.error) throw new Error(`cohorts query failed: ${cohorts.error.message}`)
  if (roster.error) throw new Error(`roster query failed: ${roster.error.message}`)

  return {
    cohortNumbers: new Set((cohorts.data ?? []).map((c) => c.number)),
    existing: new Map((roster.data ?? []).map((r) => [r.email, { claimed: r.claimed_by !== null }])),
  }
}
