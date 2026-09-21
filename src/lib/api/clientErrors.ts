// API 오류 응답({ error: { code, message } })을 화면 문구 키로 바꾼다.
// 서버가 돌려주는 message 는 로그·개발용(영어)이고, 사용자에게는 code 에 맞는 현재 언어 문구(messages 의 apiErrors)를 보여 준다.
const CODES = ['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'INVALID_FILE', 'INVALID_INPUT', 'UNKNOWN_COHORT', 'ADMIN_CONFIRM_REQUIRED', 'RATE_LIMITED', 'INTERNAL'] as const
export type ClientApiErrorCode = (typeof CODES)[number]

/** 응답 본문에서 알려진 오류 코드를 꺼낸다. 없거나 모르는 코드면 'generic' */
export function apiErrorKey(json: unknown): ClientApiErrorCode | 'generic' {
  const code = typeof json === 'object' && json !== null ? (json as { error?: { code?: unknown } }).error?.code : undefined
  return (CODES as readonly string[]).includes(code as string) ? (code as ClientApiErrorCode) : 'generic'
}

/** fetch 실패를 코드와 함께 던지기 위한 오류 */
export class ApiCallError extends Error {
  constructor(readonly key: ClientApiErrorCode | 'generic') {
    super(key)
  }
}
