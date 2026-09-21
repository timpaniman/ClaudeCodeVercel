// Design Ref: §4.2 POST /api/admin/roster/preview — CSV 를 파싱·검증해 결과만 돌려준다 (DB 쓰기 없음).
import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/session'
import { apiError } from '@/lib/api/errors'
import {
  MAX_ROSTER_FILE_BYTES,
  hasAdminRows,
  parseRosterCsv,
  summarizeRoster,
  validateRosterRows,
} from '@/features/admin/services/roster'
import { loadRosterContext } from '@/features/admin/services/rosterContext'

export async function POST(request: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return apiError('INVALID_FILE', 'Please upload a CSV file.', 400)
  }

  const file = form.get('file')
  if (!(file instanceof File)) return apiError('INVALID_FILE', 'Please upload a CSV file.', 400)
  if (file.size === 0) return apiError('INVALID_FILE', 'The file is empty.', 400)
  if (file.size > MAX_ROSTER_FILE_BYTES) {
    return apiError('INVALID_FILE', `File too large (max ${MAX_ROSTER_FILE_BYTES / 1024 / 1024}MB).`, 400)
  }
  if (!/\.(csv|txt)$/i.test(file.name)) {
    return apiError('INVALID_FILE', 'Only .csv files are accepted.', 400)
  }

  const parsed = parseRosterCsv(await file.text())
  // 파일 안의 문제는 키와 값(details.reason)으로 돌려주고, 화면이 현재 언어로 번역한다
  if (parsed.error) return apiError('INVALID_FILE', `Invalid roster file: ${parsed.error.key}`, 400, { reason: parsed.error })

  try {
    const ctx = await loadRosterContext(gate.supabase)
    const rows = validateRosterRows(parsed.rows, ctx)
    return NextResponse.json({ summary: summarizeRoster(rows), hasAdminRows: hasAdminRows(rows), rows })
  } catch (e) {
    console.error('[roster/preview]', e)
    return apiError('INTERNAL', 'Something went wrong. Please try again later.', 500)
  }
}
