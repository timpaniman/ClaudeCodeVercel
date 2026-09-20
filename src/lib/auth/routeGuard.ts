// Design Ref: §5.1 — 라우트 가드 규칙 (middleware 가 사용하는 순수 함수, 단위 테스트 대상)
//
//   비로그인            → /login?next=…   (공개 경로·API 제외)
//   pending / rejected  → /pending 만 접근 가능
//   active              → /login·/pending 접근 시 /home, /admin/* 는 운영진만
//   API(/api/*)         → 리다이렉트하지 않는다 (각 핸들러가 401/403 JSON 으로 응답)

export type GuardProfile = {
  status: 'pending' | 'active' | 'rejected'
  role: 'member' | 'admin'
} | null

export type GuardDecision =
  | { type: 'next' }
  | { type: 'redirect'; to: string; next?: string; error?: string }

export interface GuardInput {
  pathname: string
  search?: string
  hasUser: boolean
  profile: GuardProfile
}

const PUBLIC_EXACT = new Set(['/login'])
const PUBLIC_PREFIXES = ['/auth/']

const isApi = (p: string) => p.startsWith('/api/')
const isPublic = (p: string) => PUBLIC_EXACT.has(p) || PUBLIC_PREFIXES.some((x) => p.startsWith(x))

export function decideRoute({ pathname, search = '', hasUser, profile }: GuardInput): GuardDecision {
  // 인증 API·콜백은 항상 통과 (각자 검증). /unsubscribe 는 메일 링크로 들어오므로 로그인 여부와 무관하게 열린다 (서명 토큰이 권한).
  if (isApi(pathname) || pathname.startsWith('/auth/') || pathname === '/unsubscribe') return { type: 'next' }

  if (!hasUser) {
    if (isPublic(pathname)) return { type: 'next' }
    if (pathname === '/') return { type: 'redirect', to: '/login' }
    return { type: 'redirect', to: '/login', next: pathname + search }
  }

  // 로그인은 됐는데 프로필이 없다 = 가입 트리거 실패 등 비정상. /login 에서 다시 시도하게 한다.
  if (!profile) {
    return pathname === '/login' ? { type: 'next' } : { type: 'redirect', to: '/login', error: 'no_profile' }
  }

  if (profile.status !== 'active') {
    return pathname === '/pending' ? { type: 'next' } : { type: 'redirect', to: '/pending' }
  }

  // active
  if (pathname === '/' || pathname === '/login' || pathname === '/pending') {
    return { type: 'redirect', to: '/home' }
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (profile.role !== 'admin') return { type: 'redirect', to: '/home' }
  }
  return { type: 'next' }
}
