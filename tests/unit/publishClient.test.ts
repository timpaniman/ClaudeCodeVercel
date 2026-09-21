import { describe, expect, test } from 'vitest'
import { noticeFromParams, noticeOf, noticeQuery } from '@/features/admin/publishClient'
import { messages } from '@/messages'

describe('noticeOf (알림 결과 → 문구 키)', () => {
  test('상태별 키와 자리표시자 값', () => {
    expect(noticeOf({ status: 'not_requested' })).toBeNull()
    expect(noticeOf({ status: 'sent', sent: 12 })).toEqual({ key: 'sent', sent: 12, failed: 0 })
    expect(noticeOf({ status: 'none' })?.key).toBe('none')
    expect(noticeOf({ status: 'not_configured' })?.key).toBe('notConfigured')
    expect(noticeOf({ status: 'already_queued' })?.key).toBe('alreadyQueued')
    expect(noticeOf({ status: 'partial', sent: 10, failed: 2 })).toEqual({ key: 'partialCounts', sent: 10, failed: 2 })
    expect(noticeOf({ status: 'partial', sent: 0, failed: 0 })?.key).toBe('partialUnknown')
  })

  test('돌려주는 모든 키가 영어·한국어 문구에 있다', () => {
    const keys = ['notConfigured', 'alreadyQueued', 'none', 'sent', 'partialCounts', 'partialUnknown'] as const
    for (const k of keys) {
      expect(messages.en.admin.notice[k]).toBeTruthy()
      expect(messages.ko.admin.notice[k]).toBeTruthy()
    }
  })
})

describe('noticeQuery ↔ noticeFromParams', () => {
  test('왕복', () => {
    expect(noticeQuery({ status: 'not_requested' })).toBe('')
    expect(noticeQuery({ status: 'sent', sent: 12 })).toBe('?n=sent&s=12')
    expect(noticeQuery({ status: 'partial', sent: 3, failed: 1 })).toBe('?n=partial&s=3&f=1')
    const q = new URLSearchParams(noticeQuery({ status: 'partial', sent: 3, failed: 1 }).slice(1))
    expect(noticeFromParams({ n: q.get('n') ?? undefined, s: q.get('s') ?? undefined, f: q.get('f') ?? undefined })).toEqual({ status: 'partial', sent: 3, failed: 1 })
  })
  test('주소에 임의의 값을 넣어도 결과를 마음대로 만들 수 없다 (허용된 코드·숫자만)', () => {
    expect(noticeFromParams({ n: '<b>피싱 문구</b>' })).toBeNull()
    expect(noticeFromParams({ n: 'not_requested' })).toBeNull()
    expect(noticeFromParams({})).toBeNull()
    expect(noticeFromParams({ n: 'sent', s: '999999999' })).toEqual({ status: 'sent', sent: 0, failed: 0 }) // 숫자 형식이 아니면 0
    expect(noticeFromParams({ n: 'sent', s: 'abc' })).toEqual({ status: 'sent', sent: 0, failed: 0 })
  })
})
