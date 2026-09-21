// 태그 입력 정리: 쉼표·줄바꿈으로 구분, 앞의 '#' 제거, 대소문자 무시 중복 제거. (공백은 태그 안에 허용: "생성형 AI")
export const MAX_TAGS = 10
export const MAX_TAG_LENGTH = 30

/** 태그 입력 오류: 문구는 library.tagErrors.* 이고 max·tag 는 문구의 자리표시자 값이다 */
export type TagError = { key: 'tooLong'; max: number; tag: string } | { key: 'tooMany'; max: number }

export function parseTags(input: string): { tags: string[]; error?: TagError } {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const part of input.split(/[,\n]+/)) {
    const tag = part.trim().replace(/^#+/, '').trim().replace(/\s+/g, ' ')
    if (!tag) continue
    if (tag.length > MAX_TAG_LENGTH) return { tags: [], error: { key: 'tooLong', max: MAX_TAG_LENGTH, tag: tag.slice(0, 12) } }
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }

  if (tags.length > MAX_TAGS) return { tags: [], error: { key: 'tooMany', max: MAX_TAGS } }
  return { tags }
}
