// Design Ref: §4.3 — API 오류 응답 형식 { error: { code, message, details } }
import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_FILE'
  | 'INVALID_INPUT'
  | 'UNKNOWN_COHORT'
  | 'ADMIN_CONFIRM_REQUIRED'
  | 'RATE_LIMITED'
  | 'INTERNAL'

export function apiError(code: ApiErrorCode, message: string, status: number, details: unknown = {}) {
  return NextResponse.json({ error: { code, message, details } }, { status })
}
