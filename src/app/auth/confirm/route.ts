// Design Ref: §4.2, §1.3-4 — 메일의 로그인 링크(token_hash) 처리.
// 링크 로그인은 PKCE code_verifier 가 필요 없어, 링크를 다른 브라우저(메일앱 내장 브라우저, iOS Safari 등)에서
// 열어도 동작한다. 그래도 홈화면 앱(PWA)과 세션이 분리될 수 있어 기본 경로는 "코드 입력"이다.
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/auth/safeNext'

const ALLOWED_TYPES: EmailOtpType[] = ['email', 'signup', 'magiclink']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNext(searchParams.get('next'))

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }

  return NextResponse.redirect(new URL('/login?error=link_invalid', origin))
}
