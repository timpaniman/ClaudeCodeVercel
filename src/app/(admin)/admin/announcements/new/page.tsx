import { getSessionProfile } from '@/lib/auth/session'
import { AnnouncementForm } from '@/features/admin/components/AnnouncementForm'
import { isNotificationConfigured } from '@/features/notifications/config'

export default async function NewAnnouncementPage() {
  const { user } = await getSessionProfile()
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">공지 작성</h1>
      <AnnouncementForm userId={user!.id} emailEnabled={isNotificationConfigured()} />
    </div>
  )
}
