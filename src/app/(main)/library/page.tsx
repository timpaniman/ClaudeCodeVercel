import Link from 'next/link'
import { Upload } from 'lucide-react'
import { getSessionProfile } from '@/lib/auth/session'
import { LibraryFilters } from '@/features/library/components/LibraryFilters'
import { ResourceItem } from '@/features/library/components/ResourceItem'
import { PAGE_SIZE, parseLibraryParams, toSearchString } from '@/features/library/params'
import { loadCohorts, searchResources, type ResourceListItem } from '@/features/library/queries'

export const metadata = { title: '자료 — AI4CEO' }

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const params = parseLibraryParams(searchParams)
  const { supabase, profile } = await getSessionProfile()

  let cohorts: Awaited<ReturnType<typeof loadCohorts>> = []
  let items: ResourceListItem[] = []
  let total = 0
  let failed = false

  try {
    cohorts = await loadCohorts(supabase)
    ;({ items, total } = await searchResources(supabase, params, cohorts))
  } catch (e) {
    console.error('[library]', e)
    failed = true
  }

  // 재학생(내 기수가 재학 중)은 본 기수와 공용만 볼 수 있다. 졸업생·운영진은 전 기수.
  const myCohort = cohorts.find((c) => c.id === profile?.cohort_id)
  const canViewAll = profile?.role === 'admin' || (myCohort !== undefined && !myCohort.isActive)
  const lockedNumbers = canViewAll ? [] : cohorts.filter((c) => c.id !== profile?.cohort_id).map((c) => c.number)

  const remaining = total - items.length
  const hasFilter = params.q !== '' || params.cohort !== null || params.category !== null || params.week !== null

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">
          자료 {!failed && <span className="text-base font-normal text-gray-400">{total}건</span>}
        </h1>
        {profile?.role === 'admin' && (
          <Link
            href="/admin/resources/new"
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-semibold"
          >
            <Upload size={18} aria-hidden /> 자료 올리기
          </Link>
        )}
      </header>

      <LibraryFilters params={params} cohorts={cohorts} lockedNumbers={lockedNumbers} />

      {failed ? (
        <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-base text-red-300 space-y-3">
          <p>자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
          <Link href={`/library${toSearchString(params, { page: params.page })}`} className="inline-flex items-center min-h-11 underline underline-offset-4">
            다시 시도
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center space-y-3" data-testid="library-empty">
          <p className="text-base text-gray-300">{hasFilter ? '검색 결과가 없습니다.' : '아직 등록된 자료가 없습니다.'}</p>
          {hasFilter && (
            <Link href="/library" className="inline-flex items-center min-h-11 text-base text-indigo-300 underline underline-offset-4">
              필터 초기화
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-3" data-testid="library-list">
            {items.map((item) => (
              <ResourceItem key={item.id} item={item} query={params.q} />
            ))}
          </ul>

          {remaining > 0 && (
            <Link
              href={`/library${toSearchString(params, { page: params.page + 1 })}`}
              scroll={false}
              className="flex items-center justify-center min-h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-base font-medium text-gray-200"
            >
              더 보기 ({Math.min(PAGE_SIZE, remaining)}건 / 남은 {remaining}건)
            </Link>
          )}
        </>
      )}
    </div>
  )
}
