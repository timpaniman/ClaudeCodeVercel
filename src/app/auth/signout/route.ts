import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST 전용 (링크 클릭·프리페치로 로그아웃되는 일을 막는다)
export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
