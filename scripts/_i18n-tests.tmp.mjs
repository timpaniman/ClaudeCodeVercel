// 임시: 문구 대신 키를 돌려주도록 바뀐 함수들의 단위 테스트를 갱신한다
import fs from 'node:fs'
const rd = (p) => fs.readFileSync(p, 'utf8')
const wr = (p, s) => fs.writeFileSync(p, s)
function rep(p, pairs) {
  let s = rd(p)
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error('missing in ' + p + ': ' + a.slice(0, 80))
    s = s.split(a).join(b)
  }
  wr(p, s)
}

rep('tests/unit/announcements.test.ts', [
  ["expect(validateAnnouncement({ title: '  ', body: '내용' })).toContain('제목')", "expect(validateAnnouncement({ title: '  ', body: '내용' })).toEqual({ key: 'titleRequired' })"],
  ["expect(validateAnnouncement({ title: '공지', body: ' \\n ' })).toContain('내용')", "expect(validateAnnouncement({ title: '공지', body: ' \\n ' })).toEqual({ key: 'bodyRequired' })"],
  ["expect(validateAnnouncement({ title: 'a'.repeat(MAX_TITLE_LENGTH + 1), body: 'x' })).toContain('제목은')", "expect(validateAnnouncement({ title: 'a'.repeat(MAX_TITLE_LENGTH + 1), body: 'x' })).toEqual({ key: 'titleTooLong', max: MAX_TITLE_LENGTH })"],
  ["expect(validateAnnouncement({ title: 'a', body: 'x'.repeat(MAX_BODY_LENGTH + 1) })).toContain('내용은')", "expect(validateAnnouncement({ title: 'a', body: 'x'.repeat(MAX_BODY_LENGTH + 1) })).toEqual({ key: 'bodyTooLong', max: MAX_BODY_LENGTH })"],
])
rep('tests/unit/tags.test.ts', [
  ["expect(parseTags('a'.repeat(MAX_TAG_LENGTH + 1)).error).toContain('이내')", "expect(parseTags('a'.repeat(MAX_TAG_LENGTH + 1)).error).toEqual({ key: 'tooLong', max: MAX_TAG_LENGTH, tag: 'a'.repeat(12) })"],
  ["expect(parseTags(many).error).toContain('최대')", "expect(parseTags(many).error).toEqual({ key: 'tooMany', max: MAX_TAGS })"],
])
rep('tests/unit/library.test.ts', [
  ["expect(validateUpload({ name: 'run.exe', size: 1000 })).toContain('올릴 수 없는')", "expect(validateUpload({ name: 'run.exe', size: 1000 })).toMatchObject({ key: 'badType' })"],
  ["expect(validateUpload({ name: 'a.pdf', size: 0 })).toBe('빈 파일입니다.')", "expect(validateUpload({ name: 'a.pdf', size: 0 })).toEqual({ key: 'empty' })"],
  ["expect(validateUpload({ name: 'a.pdf', size: MAX_UPLOAD_BYTES + 1 })).toContain('너무 큽니다')", "expect(validateUpload({ name: 'a.pdf', size: MAX_UPLOAD_BYTES + 1 })).toEqual({ key: 'tooLarge', max: MAX_UPLOAD_BYTES / 1024 / 1024 })"],
  ["expect(validateUpload({ name: 'a.PDF.exe', size: 10 })).toContain('올릴 수 없는')", "expect(validateUpload({ name: 'a.PDF.exe', size: 10 })).toMatchObject({ key: 'badType' })"],
])
rep('tests/unit/directory-profile.test.ts', [
  ["errors: { name: expect.stringContaining('입력') } })", "errors: { name: { key: 'nameRequired' } } })"],
  ["errors: { name: expect.any(String) } })", "errors: { name: { key: 'nameTooLong', max: PROFILE_LIMITS.name } } })"],
  ["errors: { bio: expect.any(String) } })", "errors: { bio: { key: 'bioTooLong', max: PROFILE_LIMITS.bio } } })"],
])
rep('tests/unit/roster.test.ts', [
  ["expect(r.error).toContain('cohort_number(기수)')", "expect(r.error).toEqual({ key: 'missingColumns', columns: 'cohort_number' })"],
  ["expect(parseRosterCsv('email,name,cohort_number\\n').error).toContain('데이터 행이 없습니다')", "expect(parseRosterCsv('email,name,cohort_number\\n').error).toEqual({ key: 'noRows' })"],
  ["expect(parseRosterCsv(many).error).toContain(`${MAX_ROSTER_ROWS}행`)", "expect(parseRosterCsv(many).error).toEqual({ key: 'tooManyRows', max: MAX_ROSTER_ROWS, count: MAX_ROSTER_ROWS + 1 })"],
  ["expect(out[0].reason).toContain('이메일 형식')", "expect(out[0].reason).toEqual({ key: 'emailFormat' })"],
  ["expect(out[1].reason).toContain('이름')", "expect(out[1].reason).toEqual({ key: 'nameEmpty' })"],
  ["expect(out[2].reason).toContain('기수 값')", "expect(out[2].reason).toEqual({ key: 'cohortUnreadable', value: 'abc' })"],
  ["expect(out[3].reason).toContain('99기')", "expect(out[3].reason).toEqual({ key: 'cohortUnknown', cohort: 99 })"],
  ["expect(out[4].reason).toContain('역할')", "expect(out[4].reason).toEqual({ key: 'roleInvalid', value: 'root' })"],
])

wr(
  'tests/unit/publishClient.test.ts',
  `import { describe, expect, test } from 'vitest'
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
`,
)
console.log('테스트 갱신 완료')
