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
    return apiError('INVALID_FILE', 'CSV 파일을 업로드해 주세요.', 400)
  }

  const file = form.get('file')
  if (!(file instanceof File)) return apiError('INVALID_FILE', 'CSV 파일을 업로드해 주세요.', 400)
  if (file.size === 0) return apiError('INVALID_FILE', '빈 파일입니다.', 400)
  if (file.size > MAX_ROSTER_FILE_BYTES) {
    return apiError('INVALID_FILE', `파일이 너무 큽니다. (최대 ${MAX_ROSTER_FILE_BYTES / 1024 / 1024}MB)`, 400)
  }
  if (!/\.(csv|txt)$/i.test(file.name)) {
    return apiError('INVALID_FILE', 'CSV 파일(.csv)만 올릴 수 있습니다.', 400)
  }

  const parsed = parseRosterCsv(await file.text())
  if (parsed.error) return apiError('INVALID_FILE', parsed.error, 400)

  try {
    const ctx = await loadRosterContext(gate.supabase)
    const rows = validateRosterRows(parsed.rows, ctx)
    return NextResponse.json({ summary: summarizeRoster(rows), hasAdminRows: hasAdminRows(rows), rows })
  } catch (e) {
    console.error('[roster/preview]', e)
    return apiError('INTERNAL', '일시적인 오류입니다. 잠시 후 다시 시도해 주세요.', 500)
  }
}
