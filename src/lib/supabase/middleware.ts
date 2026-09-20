// Design Ref: §5.1, §2.4 — 세션 갱신 + 라우트 가드. 규칙 자체는 lib/auth/routeGuard.ts (단위 테스트됨).
// 요청마다 profiles 를 1회 조회한다 (500명 규모에서 충분, 커스텀 JWT 클레임은 v1.1).
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { decideRoute, type GuardProfile } from '@/lib/auth/routeGuard'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile: GuardProfile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('status, role').eq('id', user.id).maybeSingle()
    profile = data ? { status: data.status, role: data.role } : null
  }

  const decision = decideRoute({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    hasUser: !!user,
    profile,
  })

  if (decision.type === 'redirect') {
    const url = request.nextUrl.clone()
    url.pathname = decision.to
    url.search = ''
    if (decision.next) url.searchParams.set('next', decision.next)
    if (decision.error) url.searchParams.set('error', decision.error)
    const redirect = NextResponse.redirect(url)
    // 세션 갱신으로 설정된 쿠키를 리다이렉트 응답에도 옮긴다
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  return supabaseResponse
}
