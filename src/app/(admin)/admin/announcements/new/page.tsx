import { getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/session'
import { AnnouncementForm } from '@/features/admin/components/AnnouncementForm'
import { isNotificationConfigured } from '@/features/notifications/config'

export default async function NewAnnouncementPage() {
  const t = await getTranslations('admin.titles')
  const { user } = await getSessionProfile()
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('announcementNew')}</h1>
      <AnnouncementForm userId={user!.id} emailEnabled={isNotificationConfigured()} />
    </div>
  )
}
