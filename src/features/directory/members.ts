// Design Ref: §5.4 /directory — 멤버 검색·기수별 집계 (순수 함수). 데이터는 directory_members RPC 가 주며 이메일은 포함되지 않는다.
export interface Member {
  id: string
  name: string
  company: string | null
  position: string | null
  bio: string | null
  avatarUrl: string | null
  githubUrl: string | null
  linkedinUrl: string | null
  websiteUrl: string | null
  cohortId: number | null
}

export const MAX_SEARCH_RESULTS = 100

/** 이름·회사·직책에서 검색어(공백으로 구분한 모든 단어)가 모두 들어 있는 멤버 */
export function filterMembers(members: readonly Member[], query: string): Member[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [...members]
  return members.filter((m) => {
    const hay = `${m.name} ${m.company ?? ''} ${m.position ?? ''}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

/** 기수 id → 활성 멤버 수 */
export function countByCohort(members: readonly Member[]): Map<number, number> {
  const out = new Map<number, number>()
  for (const m of members) if (m.cohortId !== null) out.set(m.cohortId, (out.get(m.cohortId) ?? 0) + 1)
  return out
}

/** 이름순(가나다) 정렬 */
export const sortByName = (members: readonly Member[]): Member[] => [...members].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
