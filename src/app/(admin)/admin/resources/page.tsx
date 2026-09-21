import Link from 'next/link'
import { Upload } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/session'
import { ResourceAdminTable, type AdminResourceRow } from '@/features/admin/components/ResourceAdminTable'
import { noticeFromParams } from '@/features/admin/publishClient'
import { loadCohorts } from '@/features/library/queries'
import { isNotificationConfigured } from '@/features/notifications/config'

export default async function AdminResourcesPage({ searchParams }: { searchParams: { n?: string; s?: string; f?: string } }) {
  const t = await getTranslations('admin')
  const { supabase } = await getSessionProfile()
  const cohorts = await loadCohorts(supabase)
  const numberById = new Map(cohorts.map((c) => [c.id, c.number]))

  const { data } = await supabase
    .from('resources')
    .select('id, title, cohort_id, category, is_published, download_count, created_at, storage_path')
    .order('created_at', { ascending: false })
    .limit(500)

  const rows: AdminResourceRow[] = (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    cohortNumber: r.cohort_id === null ? null : (numberById.get(r.cohort_id) ?? null),
    category: r.category,
    isPublished: r.is_published,
    downloadCount: r.download_count,
    createdAt: r.created_at,
    storagePath: r.storage_path,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white">{t('titles.resources')}</h1>
        <Link href="/admin/resources/new" className="inline-flex items-center gap-2 min-h-12 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-semibold">
          <Upload size={18} aria-hidden /> {t('uploadResource')}
        </Link>
      </div>
      <ResourceAdminTable rows={rows} emailEnabled={isNotificationConfigured()} initialNotice={noticeFromParams(searchParams)} />
    </div>
  )
}
