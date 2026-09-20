import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import { getSessionProfile } from '@/lib/auth/session'
import { CohortBadge } from '@/components/ui/CohortBadge'
import { MemberCard } from '@/features/directory/components/MemberCard'
import { filterMembers, sortByName, type Member } from '@/features/directory/members'
import { loadMembers } from '@/features/directory/queries'
import { loadCohorts } from '@/features/library/queries'

export default async function CohortMembersPage({
  params,
  searchParams,
}: {
  params: { cohortNumber: string }
  searchParams: { q?: string }
}) {
  if (!/^\d{1,3}$/.test(params.cohortNumber)) notFound()
  const number = Number(params.cohortNumber)
  const q = (searchParams.q ?? '').replace(/\s+/g, ' ').trim().slice(0, 50)

  const { supabase } = await getSessionProfile()
  const cohorts = await loadCohorts(supabase)
  const cohort = cohorts.find((c) => c.number === number)
  if (!cohort) notFound()

  let members: Member[] = []
  let failed = false
  try {
    members = await loadMembers(supabase, cohort.id)
  } catch (e) {
    console.error('[directory/cohort]', e)
    failed = true
  }
  const shown = sortByName(filterMembers(members, q))

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <Link href="/directory" className="inline-flex items-center gap-2 min-h-11 text-base text-gray-400 hover:text-white">
        <ArrowLeft size={18} aria-hidden /> 멤버
      </Link>

      <header className="flex items-center gap-3">
        <CohortBadge cohortNumber={cohort.number} size="lg" />
        <h1 className="text-2xl font-bold text-white">
          {cohort.number}기 <span className="text-base font-normal text-gray-400">{members.length}명</span>
        </h1>
      </header>

      <form action={`/directory/${cohort.number}`} method="get" role="search" className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} aria-hidden />
        <input
          name="q"
          type="search"
          defaultValue={q}
          maxLength={50}
          aria-label="이 기수에서 검색"
          placeholder="이름·회사·직책 검색"
          className="w-full min-h-12 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </form>

      {failed ? (
        <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-base text-red-300">
          멤버 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-base text-gray-400" data-testid="directory-empty">
          {q ? '검색 결과가 없습니다.' : '아직 표시할 멤버가 없습니다.'}
        </p>
      ) : (
        <ul className="space-y-3" data-testid="directory-results">
          {shown.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </ul>
      )}
    </div>
  )
}
