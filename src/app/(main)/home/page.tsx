import Link from 'next/link'
import { ArrowRight, Search, ShieldCheck } from 'lucide-react'
import { getSessionProfile } from '@/lib/auth/session'
import { CohortBadge } from '@/components/ui/CohortBadge'
import { AnnouncementItem } from '@/features/announcements/components/AnnouncementItem'
import { listAnnouncements, type AnnouncementListItem } from '@/features/announcements/queries'
import { ResourceItem } from '@/features/library/components/ResourceItem'
import { loadCohorts, recentResources, type ResourceListItem } from '@/features/library/queries'

export const metadata = { title: '홈 — AI4CEO' }

const HOME_ANNOUNCEMENTS = 3
const NEW_RESOURCE_DAYS = 7

// Design Ref: §5.4 /home — 인사말+기수 배지, 고정 공지(최대 3, 안 읽음 점), 새 자료(최근 7일), 내 기수 자료 바로가기, 검색바
export default async function HomePage() {
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
          <h1 className="text-2xl font-bold text-white">{profile?.name} 대표님, 안녕하세요</h1>
          {cohortNumber !== null && <CohortBadge cohortNumber={cohortNumber} size="lg" />}
        </div>

        <form action="/library" method="get" role="search" className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} aria-hidden />
          <input
            name="q"
            type="search"
            maxLength={100}
            aria-label="자료 검색"
            placeholder="자료 검색"
            className="w-full min-h-12 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </form>
      </header>

      {failed && (
        <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-base text-red-300">
          일부 내용을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      <section aria-labelledby="home-announcements" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="home-announcements" className="text-lg font-semibold text-white">공지</h2>
          <Link href="/announcements" className="inline-flex items-center gap-1 min-h-11 text-base text-indigo-300 hover:text-indigo-200">
            전체 보기 <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        {announcements.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-base text-gray-400" data-testid="home-announcements-empty">
            아직 공지가 없습니다.
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
            새 자료 <span className="text-base font-normal text-gray-400">최근 {NEW_RESOURCE_DAYS}일</span>
          </h2>
          <div className="flex items-center gap-4">
            {cohortNumber !== null && (
              <Link href={`/library?cohort=${cohortNumber}`} className="inline-flex items-center min-h-11 text-base text-indigo-300 hover:text-indigo-200">
                내 기수 자료
              </Link>
            )}
            <Link href="/library" className="inline-flex items-center gap-1 min-h-11 text-base text-indigo-300 hover:text-indigo-200">
              전체 자료 <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
        {fresh.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-base text-gray-400" data-testid="home-new-empty">
            최근 {NEW_RESOURCE_DAYS}일 안에 올라온 새 자료가 없습니다.
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
          className="flex items-center gap-3 min-h-14 bg-indigo-600/15 border border-indigo-500/30 rounded-2xl px-5 text-base font-medium text-indigo-200 hover:bg-indigo-600/25 transition-colors"
        >
          <ShieldCheck size={20} aria-hidden />
          관리자 화면으로 이동
        </Link>
      )}
    </div>
  )
}
