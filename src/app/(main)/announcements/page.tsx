import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/session'
import { AnnouncementItem } from '@/features/announcements/components/AnnouncementItem'
import { ANNOUNCEMENT_PAGE_SIZE, listAnnouncements, type AnnouncementListItem } from '@/features/announcements/queries'

export async function generateMetadata() {
  const t = await getTranslations('announcements')
  return { title: t('metaTitle') }
}

export default async function AnnouncementsPage({ searchParams }: { searchParams: { page?: string } }) {
  const t = await getTranslations('announcements')
  const { supabase, user, profile } = await getSessionProfile()
  const page = Math.min(Math.max(Number.parseInt(searchParams.page ?? '1', 10) || 1, 1), 50)

  let items: AnnouncementListItem[] = []
  let total = 0
  let failed = false
  try {
    ;({ items, total } = await listAnnouncements(supabase, user!.id, { limit: page * ANNOUNCEMENT_PAGE_SIZE }))
  } catch (e) {
    console.error('[announcements]', e)
    failed = true
  }

  const remaining = total - items.length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        {profile?.role === 'admin' && (
          <Link
            href="/admin/announcements/new"
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white text-base font-semibold"
          >
            <PenLine size={18} aria-hidden /> {t('write')}
          </Link>
        )}
      </header>

      {failed ? (
        <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-base text-red-300 space-y-3">
          <p>{t('loadError')}</p>
          <Link href="/announcements" className="inline-flex items-center min-h-11 underline underline-offset-4">
            {t('retry')}
          </Link>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-base text-gray-300" data-testid="announcements-empty">
          {t('empty')}
        </p>
      ) : (
        <>
          <ul className="space-y-3" data-testid="announcements-list">
            {items.map((a) => (
              <AnnouncementItem key={a.id} item={a} />
            ))}
          </ul>
          {remaining > 0 && (
            <Link
              href={`/announcements?page=${page + 1}`}
              scroll={false}
              className="flex items-center justify-center min-h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-base font-medium text-gray-200"
            >
              {t('more', { remaining })}
            </Link>
          )}
        </>
      )}
    </div>
  )
}
