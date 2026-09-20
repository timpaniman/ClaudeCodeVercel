// Design Ref: §5.4 /announcements — 목록의 요약문, 안 읽음 계산. (순수 함수)

/** 마크다운 기호를 걷어내고 앞부분만 잘라 목록용 요약문을 만든다 */
export function excerptOf(markdown: string, max = 100): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    // 강조 표시는 짝을 이룰 때만 걷어낸다. 단어 안의 밑줄(snake_case, __init__)은 그대로 둔다.
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/(^|\s)__(.+?)__(?=\s|$|[.,!?)])/g, '$1$2')
    .replace(/(^|\s)_(.+?)_(?=\s|$|[.,!?)])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain
}

/** 게시된 공지 중 내가 아직 읽지 않은 개수 */
export function countUnread(publishedIds: readonly string[], readIds: Iterable<string>): number {
  const read = new Set(readIds)
  return publishedIds.filter((id) => !read.has(id)).length
}

/** 배지에 표시할 문구: 0 이면 null, 99 초과는 "99+" */
export function badgeLabel(count: number): string | null {
  if (count <= 0) return null
  return count > 99 ? '99+' : String(count)
}

export const MAX_TITLE_LENGTH = 200
export const MAX_BODY_LENGTH = 20_000

/** 작성 폼 검증. 문제가 없으면 null */
export function validateAnnouncement(input: { title: string; body: string }): string | null {
  const title = input.title.trim()
  if (!title) return '제목을 입력해 주세요.'
  if (title.length > MAX_TITLE_LENGTH) return `제목은 ${MAX_TITLE_LENGTH}자 이내로 입력해 주세요.`
  if (!input.body.trim()) return '내용을 입력해 주세요.'
  if (input.body.length > MAX_BODY_LENGTH) return `내용은 ${MAX_BODY_LENGTH.toLocaleString('ko-KR')}자 이내로 입력해 주세요.`
  return null
}
