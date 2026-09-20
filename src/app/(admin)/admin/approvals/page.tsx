import { getSessionProfile } from '@/lib/auth/session'
import { ApprovalList, type ApprovalItem } from '@/features/admin/components/ApprovalList'

export default async function AdminApprovalsPage() {
  const { supabase } = await getSessionProfile()

  const [{ data: cohorts }, { data: people }] = await Promise.all([
    supabase.from('cohorts').select('id, number').order('number'),
    supabase
      .from('profiles')
      .select('id, email, name, company, requested_cohort, status, created_at')
      .in('status', ['pending', 'rejected'])
      .order('created_at', { ascending: true })
      .limit(500),
  ])

  const items: ApprovalItem[] = (people ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    company: p.company,
    requestedCohort: p.requested_cohort,
    status: p.status === 'rejected' ? 'rejected' : 'pending',
    createdAt: p.created_at,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">승인 대기</h1>
      <p className="text-base text-gray-400">
        명단에 없는 이메일로 가입한 분들입니다. 기수를 확인하고 승인하면 바로 이용할 수 있습니다.
        명단에 나중에 등록하면 자동으로 승인되므로 이 화면에서 처리하지 않아도 됩니다.
      </p>
      <ApprovalList items={items} cohorts={cohorts ?? []} />
    </div>
  )
}
