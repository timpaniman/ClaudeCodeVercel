// Design Ref: §4.2 (/api/admin/roster/preview·commit), §9.3 — 명단 CSV 파싱·검증 (Application 계층, 순수 함수).
// 검증은 미리보기와 확정 양쪽에서 같은 함수를 쓴다. 확정 시에는 클라이언트가 보낸 상태를 믿지 않고 다시 검증한다.
import Papa from 'papaparse'
import { z } from 'zod'

export const MAX_ROSTER_FILE_BYTES = 2 * 1024 * 1024
export const MAX_ROSTER_ROWS = 2000

export type RosterRole = 'member' | 'admin'

export interface ParsedRosterRow {
  line: number // 파일 기준 줄 번호 (헤더 = 1)
  email: string
  name: string
  cohortRaw: string
  roleRaw: string
}

export type RosterRowStatus = 'ok' | 'already_in_roster' | 'duplicate_in_file' | 'invalid'

export interface ValidatedRosterRow {
  line: number
  email: string
  name: string
  cohortNumber: number | null
  role: RosterRole
  status: RosterRowStatus
  /** already_in_roster 일 때: 이미 가입해서 수정되지 않는 행인가 */
  claimed?: boolean
  reason?: string
}

export interface RosterSummary {
  total: number
  ok: number
  alreadyInRoster: number
  duplicateInFile: number
  invalid: number
}

export interface ValidationContext {
  /** 존재하는 기수 번호 */
  cohortNumbers: Set<number>
  /** 이미 명단에 있는 이메일 → 가입(claimed) 여부 */
  existing: Map<string, { claimed: boolean }>
}

// ---- 헤더 별칭 (한글/영문) ----
const HEADER_ALIASES: Record<string, 'email' | 'name' | 'cohort' | 'role'> = {
  email: 'email', 'e-mail': 'email', 이메일: 'email', 메일: 'email',
  name: 'name', 이름: 'name', 성명: 'name',
  cohort_number: 'cohort', cohort: 'cohort', 기수: 'cohort', 기수번호: 'cohort',
  role: 'role', 역할: 'role', 권한: 'role',
}

const normalizeHeader = (h: string) => h.replace(/^﻿/, '').trim().toLowerCase().replace(/\s+/g, '_')

export type ParseResult = { rows: ParsedRosterRow[]; error?: string }

export function parseRosterCsv(text: string): ParseResult {
  const clean = text.replace(/^﻿/, '')
  // 빈 줄을 파서가 건너뛰면 그 뒤 행의 줄 번호가 어긋나므로, 모두 읽은 뒤 줄 번호를 매기고 빈 행을 제외한다.
  // (따옴표 안에 줄바꿈이 있는 셀이 있으면 줄 번호는 근사값)
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: false,
    transformHeader: (h) => {
      const key = normalizeHeader(h)
      return HEADER_ALIASES[key] ?? key
    },
  })

  const fields = parsed.meta.fields ?? []
  const missing = (['email', 'name', 'cohort'] as const).filter((f) => !fields.includes(f))
  if (missing.length > 0) {
    const label = { email: 'email(이메일)', name: 'name(이름)', cohort: 'cohort_number(기수)' } as const
    return { rows: [], error: `필수 열이 없습니다: ${missing.map((m) => label[m]).join(', ')}` }
  }
  const rows = parsed.data
    .map((r, i) => ({
      line: i + 2, // 헤더가 1번째 줄
      email: (r.email ?? '').trim(),
      name: (r.name ?? '').trim(),
      cohortRaw: (r.cohort ?? '').trim(),
      roleRaw: (r.role ?? '').trim(),
    }))
    .filter((r) => r.email || r.name || r.cohortRaw || r.roleRaw)

  if (rows.length === 0) return { rows: [], error: '데이터 행이 없습니다.' }
  if (rows.length > MAX_ROSTER_ROWS) {
    return { rows: [], error: `한 번에 ${MAX_ROSTER_ROWS}행까지 등록할 수 있습니다. (현재 ${rows.length}행)` }
  }
  return { rows }
}

// ---- 개별 값 검증 ----
const emailSchema = z.email()

/** "17", "17기", " 17 " → 17 / 그 외 null */
export function parseCohortNumber(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,3})\s*기?$/)
  if (!m) return null
  const n = Number(m[1])
  return n > 0 ? n : null
}

/** 빈 값 → member. member/admin 및 회원/운영진 허용. 그 외 null(오류) */
export function parseRole(raw: string): RosterRole | null {
  const v = raw.trim().toLowerCase()
  if (v === '' || v === 'member' || v === '회원' || v === '졸업생' || v === '재학생') return 'member'
  if (v === 'admin' || v === '운영진' || v === '관리자') return 'admin'
  return null
}

export function validateRosterRows(rows: ParsedRosterRow[], ctx: ValidationContext): ValidatedRosterRow[] {
  const seen = new Set<string>()

  return rows.map((row): ValidatedRosterRow => {
    const email = row.email.toLowerCase()
    const base = { line: row.line, email, name: row.name }
    const cohortNumber = parseCohortNumber(row.cohortRaw)
    const role = parseRole(row.roleRaw)

    const invalid = (reason: string): ValidatedRosterRow => ({
      ...base, cohortNumber, role: role ?? 'member', status: 'invalid', reason,
    })

    if (!email) return invalid('이메일이 비어 있습니다.')
    if (!emailSchema.safeParse(email).success) return invalid('이메일 형식이 올바르지 않습니다.')
    if (!row.name) return invalid('이름이 비어 있습니다.')
    if (cohortNumber === null) return invalid(`기수 값을 읽을 수 없습니다: "${row.cohortRaw}"`)
    if (!ctx.cohortNumbers.has(cohortNumber)) return invalid(`존재하지 않는 기수입니다: ${cohortNumber}기`)
    if (role === null) return invalid(`역할 값이 올바르지 않습니다: "${row.roleRaw}" (member 또는 admin)`)

    if (seen.has(email)) {
      return { ...base, cohortNumber, role, status: 'duplicate_in_file', reason: '파일 안에서 이메일이 중복됩니다. (첫 번째 행만 사용)' }
    }
    seen.add(email)

    const existing = ctx.existing.get(email)
    if (existing) {
      return {
        ...base, cohortNumber, role, status: 'already_in_roster', claimed: existing.claimed,
        reason: existing.claimed ? '이미 가입한 회원입니다. (수정되지 않음)' : '이미 명단에 있습니다. (내용을 갱신)',
      }
    }
    return { ...base, cohortNumber, role, status: 'ok' }
  })
}

export function summarizeRoster(rows: ValidatedRosterRow[]): RosterSummary {
  return {
    total: rows.length,
    ok: rows.filter((r) => r.status === 'ok').length,
    alreadyInRoster: rows.filter((r) => r.status === 'already_in_roster').length,
    duplicateInFile: rows.filter((r) => r.status === 'duplicate_in_file').length,
    invalid: rows.filter((r) => r.status === 'invalid').length,
  }
}

/** 확정 대상: 오류·파일 내 중복이 없는 행 (이미 가입한 행은 RPC 가 건너뛴다) */
export const importableRows = (rows: ValidatedRosterRow[]) =>
  rows.filter((r) => r.status === 'ok' || r.status === 'already_in_roster')

export const hasAdminRows = (rows: ValidatedRosterRow[]) => importableRows(rows).some((r) => r.role === 'admin')

/** 확정 요청 본문 스키마 (클라이언트가 보낸 값은 항상 다시 검증한다) */
export const commitBodySchema = z.object({
  rows: z
    .array(
      z.object({
        email: z.string().max(320),
        name: z.string().max(200),
        cohort_number: z.union([z.number().int(), z.string().max(10)]),
        role: z.string().max(20).optional(),
      }),
    )
    .min(1)
    .max(MAX_ROSTER_ROWS),
  confirmAdminRows: z.boolean().optional(),
})
export type CommitBody = z.infer<typeof commitBodySchema>
