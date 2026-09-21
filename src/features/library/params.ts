// Design Ref: §5.4 /library — 필터·검색·정렬·페이지는 URL 쿼리스트링이 기준이다 (서버 컴포넌트가 읽고, 공유·뒤로가기가 그대로 동작).
export const CATEGORIES = ['lecture', 'code', 'video', 'reference', 'assignment'] as const
export type Category = (typeof CATEGORIES)[number]

export const PAGE_SIZE = 20
export const MAX_PAGE = 50
export const MAX_WEEK = 20
export const MAX_QUERY_LENGTH = 100

export type SortKey = 'latest' | 'downloads'

export interface LibraryParams {
  q: string
  /** 'common' = 전체 공용, number = 기수 번호, null = 전체 */
  cohort: 'common' | number | null
  category: Category | null
  week: number | null
  sort: SortKey
  page: number
}

export const DEFAULT_PARAMS: LibraryParams = { q: '', cohort: null, category: null, week: null, sort: 'latest', page: 1 }

type RawParams = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v)

function intInRange(raw: string | undefined, min: number, max: number): number | null {
  if (raw === undefined || !/^\d{1,4}$/.test(raw)) return null
  const n = Number(raw)
  return n >= min && n <= max ? n : null
}

/** 어떤 값이 들어와도 안전한 기본값으로 정리한다 (URL 은 사용자가 마음대로 고칠 수 있다) */
export function parseLibraryParams(raw: RawParams): LibraryParams {
  const q = (first(raw.q) ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH)

  const cohortRaw = first(raw.cohort)
  const cohort = cohortRaw === 'common' ? 'common' : intInRange(cohortRaw, 1, 999)

  const categoryRaw = first(raw.category)
  const category = (CATEGORIES as readonly string[]).includes(categoryRaw ?? '') ? (categoryRaw as Category) : null

  const sort: SortKey = first(raw.sort) === 'downloads' ? 'downloads' : 'latest'

  return {
    q,
    cohort,
    category,
    week: intInRange(first(raw.week), 1, MAX_WEEK),
    sort,
    page: intInRange(first(raw.page), 1, MAX_PAGE) ?? 1,
  }
}

/** 기본값과 같은 항목은 생략해 짧은 URL 을 만든다. 필터가 바뀌면 page 는 1로 돌아간다(overrides 에 page 가 없을 때). */
export function toSearchString(current: LibraryParams, overrides: Partial<LibraryParams> = {}): string {
  const next: LibraryParams = { ...current, ...overrides }
  if (!('page' in overrides)) next.page = 1

  const sp = new URLSearchParams()
  if (next.q) sp.set('q', next.q)
  if (next.cohort !== null) sp.set('cohort', String(next.cohort))
  if (next.category) sp.set('category', next.category)
  if (next.week !== null) sp.set('week', String(next.week))
  if (next.sort !== 'latest') sp.set('sort', next.sort)
  if (next.page > 1) sp.set('page', String(next.page))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

/** LIKE 패턴의 특수문자(%, _, \)를 문자 그대로 검색하도록 이스케이프한다 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, '\\$&')
}
