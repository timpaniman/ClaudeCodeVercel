import { describe, expect, test } from 'vitest'
import {
  MAX_ROSTER_ROWS,
  commitBodySchema,
  hasAdminRows,
  importableRows,
  parseCohortNumber,
  parseRole,
  parseRosterCsv,
  summarizeRoster,
  validateRosterRows,
  type ValidationContext,
} from '@/features/admin/services/roster'

const ctx = (over: Partial<ValidationContext> = {}): ValidationContext => ({
  cohortNumbers: new Set([1, 12, 17]),
  existing: new Map(),
  ...over,
})

describe('parseRosterCsv', () => {
  test('영문 헤더 + BOM + 빈 줄', () => {
    const r = parseRosterCsv('﻿email,name,cohort_number\r\na@b.com,홍길동,12\r\n\r\nc@d.com,김철수,17\r\n')
    expect(r.error).toBeUndefined()
    expect(r.rows).toEqual([
      { line: 2, email: 'a@b.com', name: '홍길동', cohortRaw: '12', roleRaw: '' },
      { line: 4, email: 'c@d.com', name: '김철수', cohortRaw: '17', roleRaw: '' },
    ])
  })

  test('한글 헤더(이메일, 이름, 기수, 역할)를 인식한다', () => {
    const r = parseRosterCsv('이메일,이름,기수,역할\na@b.com,홍길동,17기,운영진')
    expect(r.error).toBeUndefined()
    expect(r.rows[0]).toMatchObject({ email: 'a@b.com', name: '홍길동', cohortRaw: '17기', roleRaw: '운영진' })
  })

  test('열 순서가 달라도, 알 수 없는 열이 있어도 읽는다', () => {
    const r = parseRosterCsv('name,memo,cohort,email\n홍길동,메모,12,a@b.com')
    expect(r.rows[0]).toMatchObject({ email: 'a@b.com', name: '홍길동', cohortRaw: '12' })
  })

  test('필수 열이 없으면 오류 메시지를 준다', () => {
    const r = parseRosterCsv('email,name\na@b.com,홍길동')
    expect(r.rows).toEqual([])
    expect(r.error).toEqual({ key: 'missingColumns', columns: 'cohort_number' })
  })

  test('데이터 행이 없거나 너무 많으면 오류', () => {
    expect(parseRosterCsv('email,name,cohort_number\n').error).toEqual({ key: 'noRows' })
    const many = 'email,name,cohort_number\n' + Array.from({ length: MAX_ROSTER_ROWS + 1 }, (_, i) => `u${i}@b.com,n,1`).join('\n')
    expect(parseRosterCsv(many).error).toEqual({ key: 'tooManyRows', max: MAX_ROSTER_ROWS, count: MAX_ROSTER_ROWS + 1 })
  })

  test('따옴표로 감싼 쉼표 포함 이름', () => {
    const r = parseRosterCsv('email,name,cohort_number\na@b.com,"홍길동, 대표",12')
    expect(r.rows[0].name).toBe('홍길동, 대표')
  })
})

describe('parseCohortNumber / parseRole', () => {
  test.each([['17', 17], ['17기', 17], [' 12 기 ', 12], ['0', null], ['abc', null], ['', null], ['1.5', null], ['-3', null]])(
    '기수 %j → %j', (raw, expected) => expect(parseCohortNumber(raw)).toBe(expected),
  )
  test.each([['', 'member'], ['member', 'member'], ['MEMBER', 'member'], ['회원', 'member'], ['admin', 'admin'], ['운영진', 'admin'], ['superuser', null]])(
    '역할 %j → %j', (raw, expected) => expect(parseRole(raw)).toBe(expected),
  )
})

describe('validateRosterRows', () => {
  const rows = (csv: string) => parseRosterCsv('email,name,cohort_number,role\n' + csv).rows

  test('정상 행은 ok, 이메일은 소문자로 정규화', () => {
    const [r] = validateRosterRows(rows('A@B.COM,홍길동,12,'), ctx())
    expect(r).toMatchObject({ status: 'ok', email: 'a@b.com', cohortNumber: 12, role: 'member' })
  })

  test('오류 사유: 이메일 형식 / 빈 이름 / 잘못된 기수 / 없는 기수 / 잘못된 역할', () => {
    const out = validateRosterRows(
      rows(['not-an-email,홍,12,', 'a@b.com,,12,', 'b@b.com,홍,abc,', 'c@b.com,홍,99,', 'd@b.com,홍,12,root'].join('\n')),
      ctx(),
    )
    expect(out.map((r) => r.status)).toEqual(['invalid', 'invalid', 'invalid', 'invalid', 'invalid'])
    expect(out[0].reason).toEqual({ key: 'emailFormat' })
    expect(out[1].reason).toEqual({ key: 'nameEmpty' })
    expect(out[2].reason).toEqual({ key: 'cohortUnreadable', value: 'abc' })
    expect(out[3].reason).toEqual({ key: 'cohortUnknown', cohort: 99 })
    expect(out[4].reason).toEqual({ key: 'roleInvalid', value: 'root' })
  })

  test('파일 안 중복은 첫 행만 사용 (대소문자 무시)', () => {
    const out = validateRosterRows(rows('a@b.com,홍,12,\nA@B.com,홍2,12,'), ctx())
    expect(out.map((r) => r.status)).toEqual(['ok', 'duplicate_in_file'])
  })

  test('이미 명단에 있는 행: 미가입은 갱신, 가입 완료는 수정 안 함', () => {
    const existing = new Map([['a@b.com', { claimed: false }], ['c@d.com', { claimed: true }]])
    const out = validateRosterRows(rows('a@b.com,홍,12,\nc@d.com,김,17,'), ctx({ existing }))
    expect(out[0]).toMatchObject({ status: 'already_in_roster', claimed: false })
    expect(out[1]).toMatchObject({ status: 'already_in_roster', claimed: true })
  })

  test('summarize / importable / hasAdminRows', () => {
    const existing = new Map([['x@b.com', { claimed: false }]])
    const out = validateRosterRows(
      rows(['a@b.com,홍,12,', 'a@b.com,홍,12,', 'bad,홍,12,', 'x@b.com,홍,12,', 'boss@b.com,대표,17,admin'].join('\n')),
      ctx({ existing }),
    )
    expect(summarizeRoster(out)).toEqual({ total: 5, ok: 2, alreadyInRoster: 1, duplicateInFile: 1, invalid: 1 })
    expect(importableRows(out)).toHaveLength(3)
    expect(hasAdminRows(out)).toBe(true)
    expect(hasAdminRows(validateRosterRows(rows('a@b.com,홍,12,'), ctx()))).toBe(false)
  })

  test('오류·중복 행의 admin 은 확정 대상이 아니므로 admin 경고에 포함되지 않는다', () => {
    const out = validateRosterRows(rows('bad,대표,17,admin'), ctx())
    expect(hasAdminRows(out)).toBe(false)
  })
})

describe('commitBodySchema', () => {
  test('정상 본문을 받아들인다 (cohort_number 는 숫자/문자열 모두)', () => {
    const ok = commitBodySchema.safeParse({ rows: [{ email: 'a@b.com', name: '홍', cohort_number: 12 }, { email: 'b@b.com', name: '김', cohort_number: '17기', role: 'admin' }], confirmAdminRows: true })
    expect(ok.success).toBe(true)
  })
  test('빈 배열 / 잘못된 타입 / 너무 긴 값은 거부한다', () => {
    expect(commitBodySchema.safeParse({ rows: [] }).success).toBe(false)
    expect(commitBodySchema.safeParse({ rows: [{ email: 1, name: 'x', cohort_number: 1 }] }).success).toBe(false)
    expect(commitBodySchema.safeParse({ rows: [{ email: 'a'.repeat(400), name: 'x', cohort_number: 1 }] }).success).toBe(false)
    expect(commitBodySchema.safeParse({}).success).toBe(false)
  })
})
