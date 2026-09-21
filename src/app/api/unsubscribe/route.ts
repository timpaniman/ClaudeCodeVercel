// Design Ref: §4.2 /api/unsubscribe — 서명 토큰이 맞으면 해당 사용자의 알림을 끈다. 로그인 불필요.
//   POST (버튼/메일 앱 원클릭): 해제 실행
//   GET  (일부 메일 앱·보안 프로그램이 링크를 미리 열어 봄): 아무것도 바꾸지 않고 확인 화면으로 보낸다
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unsubscribePatch, verifyUnsubscribeToken } from '@/features/notifications/unsubscribe'

const text = (body: string, status: number) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export async function GET(request: Request) {
  const t = new URL(request.url).searchParams.get('t')
  const target = new URL('/unsubscribe', request.url)
  if (t) target.searchParams.set('t', t)
  return NextResponse.redirect(target, { status: 303 })
}

export async function POST(request: Request) {
  const secret = process.env.UNSUBSCRIBE_HMAC_SECRET ?? ''
  if (secret.length < 16) return text('Unsubscribe is temporarily unavailable.', 503)

  let token = new URL(request.url).searchParams.get('t')
  let oneClick = false
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    try {
      const form = await request.formData()
      token = token ?? (typeof form.get('t') === 'string' ? (form.get('t') as string) : null)
      oneClick = form.get('List-Unsubscribe') === 'One-Click'
    } catch {
      /* 본문이 없으면 쿼리의 토큰만 쓴다 */
    }
  }

  const payload = verifyUnsubscribeToken(secret, token)
  if (!payload) return text('This link is not valid.', 400)

  const { error } = await createAdminClient().from('profiles').update(unsubscribePatch(payload.s)).eq('id', payload.u)
  if (error) {
    console.error('[unsubscribe]', error)
    return text('Something went wrong. Please try again later.', 500)
  }

  if (oneClick) return text('OK', 200)
  const done = new URL('/unsubscribe', request.url)
  done.searchParams.set('done', '1')
  done.searchParams.set('s', payload.s)
  return NextResponse.redirect(done, { status: 303 })
}
