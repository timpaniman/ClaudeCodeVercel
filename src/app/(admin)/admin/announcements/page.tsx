import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/session'
import { AnnouncementAdminList, type AdminAnnouncementRow } from '@/features/admin/components/AnnouncementAdminList'
import { noticeFromParams } from '@/features/admin/publishClient'
import { isNotificationConfigured } from '@/features/notifications/config'

export default async function AdminAnnouncementsPage({ searchParams }: { searchParams: { n?: string; s?: string; f?: string } }) {
  const t = await getTranslations('admin')
  const { supabase } = await getSessionProfile()
  const { data } = await supabase
    .from('announcements')
    .select('id, title, is_pinned, published_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows: AdminAnnouncementRow[] = (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    isPinned: a.is_pinned,
    publishedAt: a.published_at,
    createdAt: a.created_at,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white">{t('titles.announcements')}</h1>
        <Link href="/admin/announcements/new" className="inline-flex items-center gap-2 min-h-12 px-5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-base font-semibold">
          <PenLine size={18} aria-hidden /> {t('writeAnnouncement')}
        </Link>
      </div>
      <AnnouncementAdminList rows={rows} emailEnabled={isNotificationConfigured()} initialNotice={noticeFromParams(searchParams)} />
    </div>
  )
}
