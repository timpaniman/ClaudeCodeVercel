import Link from 'next/link'
import { ArrowRight, Search, ShieldCheck } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/session'
import { CohortBadge } from '@/components/ui/CohortBadge'
import { AnnouncementItem } from '@/features/announcements/components/AnnouncementItem'
import { listAnnouncements, type AnnouncementListItem } from '@/features/announcements/queries'
import { ResourceItem } from '@/features/library/components/ResourceItem'
import { loadCohorts, recentResources, type ResourceListItem } from '@/features/library/queries'

export async function generateMetadata() {
  const t = await getTranslations('home')
  return { title: t('title') }
}

const HOME_ANNOUNCEMENTS = 3
const NEW_RESOURCE_DAYS = 7

// Design Ref: §5.4 /home — 인사말+기수 배지, 고정 공지(최대 3, 안 읽음 점), 새 자료(최근 7일), 내 기수 자료 바로가기, 검색바
export default async function HomePage() {
  const t = await getTranslations('home')
  const { supabase, user, profile } = await getSessionProfile()

  let announcements: AnnouncementListItem[] = []
  let fresh: ResourceListItem[] = []
  let cohortNumber: number | null = null
  let failed = false

  try {
    const cohorts = await loadCohorts(supabase)
    cohortNumber = cohorts.find((c) => c.id === profile?.cohort_id)?.number ?? null
    const [list, recent] = await Promise.all([
      // 고정 공지가 먼저, 고정이 3개 미만이면 최신 공지로 채운다
      listAnnouncements(supabase, user!.id, { limit: HOME_ANNOUNCEMENTS }),
      recentResources(supabase, cohorts, { days: NEW_RESOURCE_DAYS, limit: 10 }),
    ])
    announcements = list.items
    fresh = recent
  } catch (e) {
    console.error('[home]', e)
    failed = true
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{t('greeting', { name: profile?.name ?? '' })}</h1>
          {cohortNumber !== null && <CohortBadge cohortNumber={cohortNumber} size="lg" />}
        </div>

        <form action="/library" method="get" role="search" className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} aria-hidden />
          <input
            name="q"
            type="search"
            maxLength={100}
            aria-label={t('searchLabel')}
            placeholder={t('searchPlaceholder')}
            className="w-full min-h-12 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </form>
      </header>

      {failed && (
        <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-base text-red-300">
          {t('loadError')}
        </div>
      )}

      <section aria-labelledby="home-announcements" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="home-announcements" className="text-lg font-semibold text-white">{t('announcements')}</h2>
          <Link href="/announcements" className="inline-flex items-center gap-1 min-h-11 text-base text-green-300 hover:text-green-200">
            {t('viewAll')} <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        {announcements.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-base text-gray-400" data-testid="home-announcements-empty">
            {t('noAnnouncements')}
          </p>
        ) : (
          <ul className="space-y-3" data-testid="home-announcements">
            {announcements.map((a) => (
              <AnnouncementItem key={a.id} item={a} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="home-new" className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 id="home-new" className="text-lg font-semibold text-white">
            {t('newResources')} <span className="text-base font-normal text-gray-400">{t('lastDays', { days: NEW_RESOURCE_DAYS })}</span>
          </h2>
          <div className="flex items-center gap-4">
            {cohortNumber !== null && (
              <Link href={`/library?cohort=${cohortNumber}`} className="inline-flex items-center min-h-11 text-base text-green-300 hover:text-green-200">
                {t('myCohort')}
              </Link>
            )}
            <Link href="/library" className="inline-flex items-center gap-1 min-h-11 text-base text-green-300 hover:text-green-200">
              {t('allResources')} <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
        {fresh.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-base text-gray-400" data-testid="home-new-empty">
            {t('noNew', { days: NEW_RESOURCE_DAYS })}
          </p>
        ) : (
          <ul className="space-y-3" data-testid="home-new-resources">
            {fresh.map((item) => (
              <ResourceItem key={item.id} item={item} query="" />
            ))}
          </ul>
        )}
      </section>

      {profile?.role === 'admin' && (
        <Link
          href="/admin"
          className="flex items-center gap-3 min-h-14 bg-green-600/15 border border-green-500/30 rounded-2xl px-5 text-base font-medium text-green-200 hover:bg-green-600/25 transition-colors"
        >
          <ShieldCheck size={20} aria-hidden />
          {t('goAdmin')}
        </Link>
      )}
    </div>
  )
}
