import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    // 운영: 환경변수가 잘못되면 가드 없이 반쯤 동작하지 않도록 즉시 막는다 (값은 노출하지 않는다).
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Service configuration error: please check the Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).', {
        status: 503,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      })
    }
    // 개발: 초기 설정 전에는 가드를 적용하지 않고 통과
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    // 정적 자원 제외 (PWA manifest·아이콘·서비스 워커(.js)·오프라인 페이지(.html)·robots 포함). 로그인 여부와 무관하게 열려야 한다.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|txt|xml|csv|js|html)$).*)',
  ],
}
