import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil, Pin } from 'lucide-react'
import { z } from 'zod'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/session'
import { detectDevice } from '@/lib/device'
import { formatDate } from '@/lib/utils'
import { MarkdownBody } from '@/features/announcements/components/MarkdownBody'
import { getAnnouncement } from '@/features/announcements/queries'

export default async function AnnouncementDetailPage({ params }: { params: { id: string } }) {
  if (!z.uuid().safeParse(params.id).success) notFound()

  const t = await getTranslations('announcements')
  const locale = await getLocale()
  const { supabase, user, profile } = await getSessionProfile()
  // RLS: 회원에게 임시저장 공지는 조회되지 않는다 (없는 공지와 같은 404)
  const a = await getAnnouncement(supabase, params.id)
  if (!a) notFound()

  const published = a.published_at !== null && new Date(a.published_at) <= new Date()

  // 읽음 처리 + 열람 기록 (게시된 공지만). 실패해도 본문은 보여 준다.
  if (published) {
    try {
      await supabase
        .from('announcement_reads')
        .upsert({ announcement_id: a.id, user_id: user!.id }, { onConflict: 'announcement_id,user_id', ignoreDuplicates: true })
      await supabase.rpc('log_activity', {
        p_event: 'view_announcement',
        p_ref: a.id,
        p_device: detectDevice(headers().get('user-agent')),
      })
    } catch {
      /* 무시 */
    }
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Link href="/announcements" className="inline-flex items-center gap-2 min-h-11 text-base text-gray-400 hover:text-white">
        <ArrowLeft size={18} aria-hidden /> {t('back')}
      </Link>

      {!published && (
        <div role="status" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-base text-amber-200">
          {t('unpublished')}
        </div>
      )}

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white leading-snug break-words">
          {a.is_pinned && <Pin size={18} className="mr-2 inline -mt-1 text-indigo-300" aria-label={t('pinned')} />}
          {a.title}
        </h1>
        {published && <p className="text-base text-gray-400">{formatDate(a.published_at as string, locale)}</p>}
      </header>

      <MarkdownBody source={a.body} />

      {profile?.role === 'admin' && (
        <Link
          href={`/admin/announcements/${a.id}/edit`}
          className="inline-flex items-center gap-2 min-h-12 px-5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-base font-medium text-gray-100"
        >
          <Pencil size={16} aria-hidden /> {t('edit')}
        </Link>
      )}
    </article>
  )
}
