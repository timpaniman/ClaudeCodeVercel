import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Supabase 환경변수가 없으면(초기 설정 전) 가드를 적용하지 않고 통과
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || supabaseUrl === 'your-supabase-url' || !supabaseUrl.startsWith('http')) {
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
