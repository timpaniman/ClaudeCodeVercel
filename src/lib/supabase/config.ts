// Supabase 접속 설정이 쓸 수 있는 값인지 검사한다 (middleware 가 사용하는 순수 함수, 단위 테스트 대상).
// 배포 환경변수를 잘못 넣었을 때(예: 주소 대신 프로젝트 ID 만 입력) 반쯤 동작하는 상태로 서비스하지 않고 바로 드러나게 하려는 것이다.

/** https 주소이거나 로컬 개발용 http://localhost 인 경우만 통과 */
export function isValidSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    if (u.protocol === 'https:') return true
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

export function isSupabaseConfigured(url: string | undefined, anonKey: string | undefined): boolean {
  return isValidSupabaseUrl(url) && !!anonKey && anonKey.trim().length > 20
}
