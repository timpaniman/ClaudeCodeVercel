// Design Ref: §4.1 (직접 호출, RLS로 보호), §9.3 — 자료 조회. 권한 필터링은 RLS(can_view_cohort)가 하고, 여기서는 조건만 만든다.
import type { ServerClient } from '@/lib/auth/session'
import type { Tables } from '@/types/database'
import { PAGE_SIZE, escapeLike, type Category, type LibraryParams } from './params'
import { resourceKind, type FileKind } from './fileType'

export interface CohortInfo {
  id: number
  number: number
  isActive: boolean
}

export interface ResourceListItem {
  id: string
  title: string
  description: string | null
  category: Category
  weekNumber: number | null
  kind: FileKind
  downloadCount: number
  publishedAt: string | null
  createdAt: string
  cohortNumber: number | null
  tags: string[]
}

export async function loadCohorts(supabase: ServerClient): Promise<CohortInfo[]> {
  const { data, error } = await supabase.from('cohorts').select('id, number, is_active').order('number')
  if (error) throw new Error(`cohorts 조회 실패: ${error.message}`)
  return (data ?? []).map((c) => ({ id: c.id, number: c.number, isActive: c.is_active }))
}

const LIST_COLUMNS =
  'id, title, description, category, week_number, file_type, storage_path, external_url, download_count, published_at, created_at, cohort_id, tags'

export async function searchResources(
  supabase: ServerClient,
  params: LibraryParams,
  cohorts: CohortInfo[],
): Promise<{ items: ResourceListItem[]; total: number }> {
  const numberById = new Map(cohorts.map((c) => [c.id, c.number]))
  const idByNumber = new Map(cohorts.map((c) => [c.number, c.id]))

  // 운영진도 라이브러리에서는 회원과 같은 화면(공개 자료만)을 본다. 미공개는 /admin/resources 에서 관리한다.
  let q = supabase.from('resources').select(LIST_COLUMNS, { count: 'exact' }).eq('is_published', true)

  if (params.cohort === 'common') q = q.is('cohort_id', null)
  else if (typeof params.cohort === 'number') {
    const id = idByNumber.get(params.cohort)
    if (id === undefined) return { items: [], total: 0 }
    q = q.eq('cohort_id', id)
  }
  if (params.category) q = q.eq('category', params.category)
  if (params.week) q = q.eq('week_number', params.week)
  if (params.q) q = q.ilike('search_text', `%${escapeLike(params.q.toLowerCase())}%`)

  q =
    params.sort === 'downloads'
      ? q.order('download_count', { ascending: false }).order('published_at', { ascending: false, nullsFirst: false })
      : q.order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })

  const { data, error, count } = await q.range(0, params.page * PAGE_SIZE - 1)
  if (error) throw new Error(`resources 조회 실패: ${error.message}`)

  const items = (data ?? []).map((r) => toListItem(r, numberById))
  return { items, total: count ?? items.length }
}

type ListRow = Pick<
  Tables<'resources'>,
  'id' | 'title' | 'description' | 'category' | 'week_number' | 'file_type' | 'storage_path' | 'external_url' | 'download_count' | 'published_at' | 'created_at' | 'cohort_id' | 'tags'
>

function toListItem(r: ListRow, numberById: Map<number, number>): ResourceListItem {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    weekNumber: r.week_number,
    kind: resourceKind(r),
    downloadCount: r.download_count,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    cohortNumber: r.cohort_id === null ? null : (numberById.get(r.cohort_id) ?? null),
    tags: r.tags,
  }
}

/** 홈 화면용: 최근 N일 안에 공개된 자료 (열람 권한이 있는 것만 RLS 가 돌려준다) */
export async function recentResources(
  supabase: ServerClient,
  cohorts: CohortInfo[],
  opts: { days?: number; limit?: number } = {},
): Promise<ResourceListItem[]> {
  const since = new Date(Date.now() - (opts.days ?? 7) * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from('resources')
    .select(LIST_COLUMNS)
    .eq('is_published', true)
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(opts.limit ?? 10)
  if (error) throw new Error(`resources 조회 실패: ${error.message}`)
  const numberById = new Map(cohorts.map((c) => [c.id, c.number]))
  return (data ?? []).map((r) => toListItem(r, numberById))
}

export type ResourceRow = Tables<'resources'>

/** RLS 가 열람 권한을 판단한다. 없는 자료와 권한 없는 자료는 구분하지 않는다(존재 여부 노출 방지). */
export async function getResource(supabase: ServerClient, id: string): Promise<ResourceRow | null> {
  const { data, error } = await supabase.from('resources').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`resources 조회 실패: ${error.message}`)
  return data
}
