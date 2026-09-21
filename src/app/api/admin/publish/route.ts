// Design Ref: §4.2 POST /api/admin/publish — 공개/게시 + (선택) 이메일 알림을 한 번에 처리한다.
// 공개는 운영진 세션으로 RPC(publish_resource / publish_announcement)를 호출하고(DB 가 운영진 여부를 다시 검사),
// 알림 발송은 service role 저장소로 즉시 처리한다. 발송에 실패한 사람은 작업이 failed 로 남아 cron 이 이어서 보낸다.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiError } from '@/lib/api/errors'
import { requireAdminApi } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadNotificationConfig } from '@/features/notifications/config'
import { processNotificationJobs } from '@/features/notifications/process'
import { createSupabaseNotificationStore } from '@/features/notifications/store'

export const maxDuration = 60

const bodySchema = z.object({
  kind: z.enum(['resource', 'announcement']),
  id: z.uuid(),
  notify: z.boolean(),
})

export type NotificationOutcome =
  | { status: 'not_requested' }
  | { status: 'not_configured' }
  | { status: 'already_queued' }
  | { status: 'sent' | 'partial' | 'none'; sent: number; failed: number }

export async function POST(request: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return apiError('INVALID_INPUT', 'Invalid request format.', 400)
  }
  const body = bodySchema.safeParse(json)
  if (!body.success) return apiError('INVALID_INPUT', 'Invalid request body.', 400)
  const { kind, id, notify } = body.data

  const { data: jobId, error } =
    kind === 'resource'
      ? await gate.supabase.rpc('publish_resource', { p_id: id, p_notify: notify })
      : await gate.supabase.rpc('publish_announcement', { p_id: id, p_notify: notify })
  if (error) {
    if (error.code === '42501') return apiError('FORBIDDEN', 'Administrators only.', 403)
    if (error.code === 'P0002') return apiError('NOT_FOUND', 'Target not found.', 404)
    console.error('[admin/publish] rpc', error)
    return apiError('INTERNAL', 'Something went wrong. Please try again later.', 500)
  }

  let notification: NotificationOutcome = { status: 'not_requested' }
  if (notify) {
    const config = loadNotificationConfig()
    if (!jobId) {
      notification = { status: 'already_queued' } // 이미 알림 작업이 있는 항목 (중복 발송 방지)
    } else if (!config) {
      notification = { status: 'not_configured' } // 작업은 대기열에 남고, 이메일 설정 후 cron 이 발송한다
    } else {
      try {
        const [summary] = await processNotificationJobs({
          store: createSupabaseNotificationStore(createAdminClient()),
          provider: config.provider,
          siteUrl: config.siteUrl,
          hmacSecret: config.hmacSecret,
          jobId,
          // 함수 제한(maxDuration 60초) 안에 끝내기 위한 여유. 넘기면 남은 사람은 cron 이 이어서 보낸다.
          deadlineAt: Date.now() + 45_000,
        })
        if (!summary) notification = { status: 'already_queued' }
        else if (summary.failed > 0 || summary.status === 'failed') notification = { status: 'partial', sent: summary.sent, failed: summary.failed }
        else notification = { status: summary.sent > 0 ? 'sent' : 'none', sent: summary.sent, failed: 0 }
      } catch (e) {
        // 공개는 이미 끝났다. 발송 처리 오류는 작업이 대기열에 남아 cron 이 이어서 처리한다.
        console.error('[admin/publish] notify', e)
        notification = { status: 'partial', sent: 0, failed: 0 }
      }
    }
  }

  return NextResponse.json({ published: true, notification })
}
