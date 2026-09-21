// Design Ref: §4.2 GET /api/cron/notify — 대기 중이거나 실패한 알림 작업을 이어서 처리하는 안전망.
// Vercel Cron 이 `Authorization: Bearer $CRON_SECRET` 헤더를 붙여 호출한다 (vercel.json). 그 밖의 호출은 거부한다.
// (Hobby 플랜은 하루 1회만 실행할 수 있어서, 평소에는 발행 직후 /api/admin/publish 가 즉시 처리한다.)
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadNotificationConfig } from '@/features/notifications/config'
import { processNotificationJobs } from '@/features/notifications/process'
import { createSupabaseNotificationStore } from '@/features/notifications/store'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? ''
  if (secret.length < 16) return false // 비밀키가 없으면 누구도 호출할 수 없다
  const header = request.headers.get('authorization') ?? ''
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: Request) {
  if (!authorized(request)) return apiError('UNAUTHORIZED', 'Authentication required.', 401)

  const config = loadNotificationConfig()
  if (!config) return NextResponse.json({ skipped: 'not_configured' })

  try {
    const summaries = await processNotificationJobs({
      store: createSupabaseNotificationStore(createAdminClient()),
      provider: config.provider,
      siteUrl: config.siteUrl,
      hmacSecret: config.hmacSecret,
      maxJobs: 20,
      deadlineAt: Date.now() + 45_000, // maxDuration(60초) 안에 끝내기 위한 여유
    })
    // 개인정보(수신자 이메일)는 응답에 포함하지 않는다
    return NextResponse.json({ processed: summaries.length, jobs: summaries.map(({ jobId, kind, recipients, sent, failed, status }) => ({ jobId, kind, recipients, sent, failed, status })) })
  } catch (e) {
    console.error('[cron/notify]', e)
    return apiError('INTERNAL', 'Processing failed.', 500)
  }
}
