import { notFound } from 'next/navigation'
import { z } from 'zod'
import { getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/session'
import { AnnouncementForm } from '@/features/admin/components/AnnouncementForm'
import { getAnnouncement } from '@/features/announcements/queries'
import { isNotificationConfigured } from '@/features/notifications/config'

export default async function EditAnnouncementPage({ params }: { params: { id: string } }) {
  if (!z.uuid().safeParse(params.id).success) notFound()

  const t = await getTranslations('admin.titles')

  const { supabase, user } = await getSessionProfile()
  const a = await getAnnouncement(supabase, params.id)
  if (!a) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('announcementEdit')}</h1>
      <AnnouncementForm
        userId={user!.id}
        emailEnabled={isNotificationConfigured()}
        initial={{ id: a.id, title: a.title, body: a.body, isPinned: a.is_pinned, publishedAt: a.published_at }}
      />
    </div>
  )
}
