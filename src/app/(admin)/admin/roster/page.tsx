import { getSessionProfile } from '@/lib/auth/session'
import { RosterManager, type RosterEntry } from '@/features/admin/components/RosterManager'

export default async function AdminRosterPage() {
  const { supabase } = await getSessionProfile()

  const [{ data: cohorts }, { data: roster }] = await Promise.all([
    supabase.from('cohorts').select('id, number').order('number'),
    supabase.from('roster').select('email, name, cohort_id, role, claimed_by').order('cohort_id').order('name').limit(3000),
  ])

  const numberById = new Map((cohorts ?? []).map((c) => [c.id, c.number]))
  const entries: RosterEntry[] = (roster ?? []).map((r) => ({
    email: r.email,
    name: r.name,
    cohortNumber: numberById.get(r.cohort_id) ?? 0,
    role: r.role,
    joined: r.claimed_by !== null,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">명단 관리</h1>
      <RosterManager entries={entries} />
    </div>
  )
}
