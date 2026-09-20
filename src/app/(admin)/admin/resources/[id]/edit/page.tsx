import { notFound } from 'next/navigation'
import { z } from 'zod'
import { getSessionProfile } from '@/lib/auth/session'
import { ResourceForm } from '@/features/admin/components/ResourceForm'
import { getResource, loadCohorts } from '@/features/library/queries'

export default async function EditResourcePage({ params }: { params: { id: string } }) {
  if (!z.uuid().safeParse(params.id).success) notFound()

  const { supabase, user } = await getSessionProfile()
  const [resource, cohorts] = await Promise.all([getResource(supabase, params.id), loadCohorts(supabase)])
  if (!resource) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">자료 수정</h1>
      <ResourceForm
        mode="edit"
        cohorts={cohorts.map((c) => ({ id: c.id, number: c.number }))}
        userId={user!.id}
        initial={{
          id: resource.id,
          title: resource.title,
          description: resource.description ?? '',
          category: resource.category,
          cohortId: resource.cohort_id,
          weekNumber: resource.week_number,
          tags: resource.tags,
          isPublished: resource.is_published,
          storagePath: resource.storage_path,
          externalUrl: resource.external_url,
        }}
      />
    </div>
  )
}
