import { describe, expect, test } from 'vitest'
import { MAX_TAGS, MAX_TAG_LENGTH, parseTags } from '@/features/library/tags'

describe('parseTags', () => {
  test('쉼표·줄바꿈 구분, # 제거, 공백 정리', () => {
    expect(parseTags('#ai, RAG ,\n  생성형   AI ,,')).toEqual({ tags: ['ai', 'RAG', '생성형 AI'] })
  })
  test('대소문자 무시 중복 제거(처음 표기 유지)', () => {
    expect(parseTags('AI, ai, Ai, #AI')).toEqual({ tags: ['AI'] })
  })
  test('빈 입력', () => {
    expect(parseTags('')).toEqual({ tags: [] })
    expect(parseTags(' , \n ,')).toEqual({ tags: [] })
  })
  test('길이·개수 제한', () => {
    expect(parseTags('a'.repeat(MAX_TAG_LENGTH + 1)).error).toContain('이내')
    expect(parseTags('a'.repeat(MAX_TAG_LENGTH)).tags).toHaveLength(1)
    const many = Array.from({ length: MAX_TAGS + 1 }, (_, i) => `t${i}`).join(',')
    expect(parseTags(many).error).toContain('최대')
    expect(parseTags(many.split(',').slice(0, MAX_TAGS).join(',')).tags).toHaveLength(MAX_TAGS)
  })
})
