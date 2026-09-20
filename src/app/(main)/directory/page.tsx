import Link from 'next/link'
import { Search } from 'lucide-react'
import { getSessionProfile } from '@/lib/auth/session'
import { CohortBadge } from '@/components/ui/CohortBadge'
import { MemberCard } from '@/features/directory/components/MemberCard'
import { MAX_SEARCH_RESULTS, countByCohort, filterMembers, sortByName, type Member } from '@/features/directory/members'
import { loadMembers } from '@/features/directory/queries'
import { loadCohorts, type CohortInfo } from '@/features/library/queries'

export const metadata = { title: '멤버 — AI4CEO' }

// Design Ref: §5.4 /directory — 기수 카드 그리드 + 이름·회사 검색
export default async function DirectoryPage({ searchParams }: { searchParams: { q?: string } }) {
  const { supabase } = await getSessionProfile()
  const q = (searchParams.q ?? '').replace(/\s+/g, ' ').trim().slice(0, 50)

  let cohorts: CohortInfo[] = []
  let members: Member[] = []
  let failed = false
  try {
    ;[cohorts, members] = await Promise.all([loadCohorts(supabase), loadMembers(supabase)])
  } catch (e) {
    console.error('[directory]', e)
    failed = true
  }

  const numberById = new Map(cohorts.map((c) => [c.id, c.number]))
  const counts = countByCohort(members)
  const results = q ? sortByName(filterMembers(members, q)) : []

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">멤버</h1>

      <form action="/directory" method="get" role="search" className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} aria-hidden />
        <input
          name="q"
          type="search"
          defaultValue={q}
          maxLength={50}
          aria-label="멤버 검색"
          placeholder="이름·회사·직책 검색"
          className="w-full min-h-12 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </form>

      {failed ? (
        <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-base text-red-300">
          멤버 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      ) : q ? (
        <section aria-live="polite" className="space-y-3">
          <p className="text-base text-gray-400">
            “{q}” 검색 결과 {results.length}명
            {results.length > MAX_SEARCH_RESULTS && ` (상위 ${MAX_SEARCH_RESULTS}명만 표시)`}
          </p>
          {results.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-base text-gray-400" data-testid="directory-empty">
              검색 결과가 없습니다.
            </p>
          ) : (
            <ul className="space-y-3" data-testid="directory-results">
              {results.slice(0, MAX_SEARCH_RESULTS).map((m) => (
                <MemberCard key={m.id} member={m} cohortNumber={m.cohortId === null ? null : (numberById.get(m.cohortId) ?? null)} />
              ))}
            </ul>
          )}
          <Link href="/directory" className="inline-flex items-center min-h-11 text-base text-indigo-300 underline underline-offset-4">
            기수별로 보기
          </Link>
        </section>
      ) : (
        <section aria-labelledby="cohort-grid" className="space-y-3">
          <h2 id="cohort-grid" className="sr-only">기수별 멤버</h2>
          {members.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-base text-gray-400" data-testid="directory-empty">
              아직 표시할 멤버가 없습니다.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="cohort-grid">
              {[...cohorts].reverse().map((c) => {
                const n = counts.get(c.id) ?? 0
                return (
                  <li key={c.id}>
                    <Link
                      href={`/directory/${c.number}`}
                      className={`flex min-h-24 flex-col justify-between rounded-2xl border p-4 transition-colors hover:bg-white/10 ${n > 0 ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.02] opacity-70'}`}
                    >
                      <CohortBadge cohortNumber={c.number} size="lg" className="self-start" />
                      <span className="text-base text-gray-300">{n}명</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
