import { getSessionProfile } from '@/lib/auth/session'
import { ResourceForm } from '@/features/admin/components/ResourceForm'
import { loadCohorts } from '@/features/library/queries'
import { isNotificationConfigured } from '@/features/notifications/config'

export default async function NewResourcePage() {
  const { supabase, user } = await getSessionProfile()
  const cohorts = await loadCohorts(supabase)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">자료 올리기</h1>
      <ResourceForm mode="create" cohorts={cohorts.map((c) => ({ id: c.id, number: c.number }))} userId={user!.id} emailEnabled={isNotificationConfigured()} />
    </div>
  )
}
