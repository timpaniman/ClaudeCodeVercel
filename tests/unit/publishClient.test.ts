import { describe, expect, test } from 'vitest'
import { describeNotification, noticeFromParams, noticeQuery } from '@/features/admin/publishClient'

describe('describeNotification', () => {
  test('상태별 문구', () => {
    expect(describeNotification({ status: 'not_requested' })).toBeNull()
    expect(describeNotification({ status: 'sent', sent: 12 })).toBe('12명에게 알림 메일을 보냈습니다.')
    expect(describeNotification({ status: 'none' })).toContain('대상이 없습니다')
    expect(describeNotification({ status: 'not_configured' })).toContain('설정되지 않아')
    expect(describeNotification({ status: 'already_queued' })).toContain('다시 보내지 않았습니다')
    expect(describeNotification({ status: 'partial', sent: 10, failed: 2 })).toBe('10명에게 보냈고 2명은 실패했습니다. 실패한 분께는 자동으로 다시 시도합니다.')
    expect(describeNotification({ status: 'partial', sent: 0, failed: 0 })).toContain('끝내지 못했습니다')
  })
})

describe('noticeQuery ↔ noticeFromParams', () => {
  test('왕복', () => {
    expect(noticeQuery({ status: 'not_requested' })).toBe('')
    expect(noticeQuery({ status: 'sent', sent: 12 })).toBe('?n=sent&s=12')
    expect(noticeQuery({ status: 'partial', sent: 3, failed: 1 })).toBe('?n=partial&s=3&f=1')
    const q = new URLSearchParams(noticeQuery({ status: 'partial', sent: 3, failed: 1 }).slice(1))
    expect(noticeFromParams({ n: q.get('n') ?? undefined, s: q.get('s') ?? undefined, f: q.get('f') ?? undefined })).toContain('3명에게 보냈고 1명은 실패')
  })
  test('주소에 임의의 값을 넣어도 문구를 마음대로 만들 수 없다 (허용된 코드·숫자만)', () => {
    expect(noticeFromParams({ n: '<b>피싱 문구</b>' })).toBeNull()
    expect(noticeFromParams({ n: 'not_requested' })).toBeNull()
    expect(noticeFromParams({})).toBeNull()
    expect(noticeFromParams({ n: 'sent', s: '999999999' })).toBe('0명에게 알림 메일을 보냈습니다.') // 숫자 형식이 아니면 0
    expect(noticeFromParams({ n: 'sent', s: 'abc' })).toBe('0명에게 알림 메일을 보냈습니다.')
  })
})
