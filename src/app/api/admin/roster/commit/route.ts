// Design Ref: §4.2 POST /api/admin/roster/commit — 검증을 통과한 행을 admin_import_roster RPC 로 확정한다.
// 클라이언트가 보낸 값은 신뢰하지 않고 미리보기와 같은 검증을 서버에서 다시 한다.
import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/session'
import { apiError } from '@/lib/api/errors'
import {
  commitBodySchema,
  hasAdminRows,
  importableRows,
  summarizeRoster,
  validateRosterRows,
  type ParsedRosterRow,
} from '@/features/admin/services/roster'
import { loadRosterContext } from '@/features/admin/services/rosterContext'

export async function POST(request: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return apiError('INVALID_INPUT', 'Invalid request format.', 400)
  }
  const body = commitBodySchema.safeParse(json)
  if (!body.success) return apiError('INVALID_INPUT', 'Invalid request body.', 400)

  const parsed: ParsedRosterRow[] = body.data.rows.map((r, i) => ({
    line: i + 1,
    email: r.email.trim(),
    name: r.name.trim(),
    cohortRaw: String(r.cohort_number),
    roleRaw: r.role ?? '',
  }))

  try {
    const ctx = await loadRosterContext(gate.supabase)
    const rows = validateRosterRows(parsed, ctx)
    const summary = summarizeRoster(rows)

    // 오류·중복 행이 섞여 있으면 확정하지 않는다 (미리보기에서 걸러진 행만 보내야 한다)
    if (summary.invalid > 0 || summary.duplicateInFile > 0) {
      return apiError('INVALID_INPUT', 'Some rows have errors. Please review the preview again.', 422, {
        rows: rows.filter((r) => r.status === 'invalid' || r.status === 'duplicate_in_file'),
      })
    }
    if (hasAdminRows(rows) && !body.data.confirmAdminRows) {
      return apiError('ADMIN_CONFIRM_REQUIRED', 'Some rows grant administrator access. Confirmation is required.', 400)
    }

    const payload = importableRows(rows).map((r) => ({
      email: r.email,
      name: r.name,
      cohort_number: r.cohortNumber,
      role: r.role,
    }))

    const { data, error } = await gate.supabase.rpc('admin_import_roster', { rows: payload })
    if (error) {
      if (error.code === '42501') return apiError('FORBIDDEN', 'Administrators only.', 403)
      if (error.code === '22023') return apiError('INVALID_INPUT', 'Invalid input.', 422)
      console.error('[roster/commit] rpc', error)
      return apiError('INTERNAL', 'Something went wrong. Please try again later.', 500)
    }

    return NextResponse.json({ result: data })
  } catch (e) {
    console.error('[roster/commit]', e)
    return apiError('INTERNAL', 'Something went wrong. Please try again later.', 500)
  }
}
