// 태그 입력 정리: 쉼표·줄바꿈으로 구분, 앞의 '#' 제거, 대소문자 무시 중복 제거. (공백은 태그 안에 허용: "생성형 AI")
export const MAX_TAGS = 10
export const MAX_TAG_LENGTH = 30

export function parseTags(input: string): { tags: string[]; error?: string } {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const part of input.split(/[,\n]+/)) {
    const tag = part.trim().replace(/^#+/, '').trim().replace(/\s+/g, ' ')
    if (!tag) continue
    if (tag.length > MAX_TAG_LENGTH) return { tags: [], error: `태그는 ${MAX_TAG_LENGTH}자 이내로 입력해 주세요. ("${tag.slice(0, 12)}…")` }
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }

  if (tags.length > MAX_TAGS) return { tags: [], error: `태그는 최대 ${MAX_TAGS}개까지 입력할 수 있습니다.` }
  return { tags }
}
