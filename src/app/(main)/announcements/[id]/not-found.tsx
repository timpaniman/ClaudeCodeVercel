import Link from 'next/link'
import { Bell } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function AnnouncementNotFound() {
  const t = await getTranslations('announcements.notFound')
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-gray-400">
        <Bell size={28} aria-hidden />
      </div>
      <h1 className="text-xl font-bold text-white">{t('title')}</h1>
      <p className="text-base leading-relaxed text-gray-400">{t('body')}</p>
      <Link href="/announcements" className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl bg-green-600 hover:bg-green-500 text-white text-base font-semibold">
        {t('back')}
      </Link>
    </div>
  )
}
