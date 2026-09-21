'use client'

// Design Ref: §5.4 /admin/announcements — 공지 목록(게시/임시저장), 게시·게시 취소·고정·수정·삭제.
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pin } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { publishWithNotify, type NotificationResult } from '../publishClient'
import { useNoticeText } from '../useNoticeText'

export interface AdminAnnouncementRow {
  id: string
  title: string
  isPinned: boolean
  publishedAt: string | null
  createdAt: string
}

export function AnnouncementAdminList({ rows, emailEnabled = false, initialNotice = null }: { rows: AdminAnnouncementRow[]; emailEnabled?: boolean; initialNotice?: NotificationResult | null }) {
  const t = useTranslations('admin.announcements')
  const locale = useLocale()
  const text = useNoticeText()
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(() => text.notice(initialNotice))

  const run = async (id: string, action: () => PromiseLike<{ error: unknown }>, failMessage: string) => {
    setError(null)
    setBusyId(id)
    const { error: e } = await action()
    setBusyId(null)
    if (e) setError(failMessage)
    else router.refresh()
  }

  const supabase = () => createClient()
  const btn = 'min-h-11 px-4 rounded-xl text-sm font-medium disabled:opacity-50'

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-base text-gray-400" data-testid="admin-announcements-empty">
        {t('empty')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" data-testid="notify-notice" className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm px-4 py-3 rounded-xl">
          {notice}
        </div>
      )}
      <ul className="space-y-3" data-testid="admin-announcements-list">
        {rows.map((r) => {
          const published = r.publishedAt !== null
          return (
            <li key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div>
                <Link href={`/announcements/${r.id}`} className="text-base font-semibold text-white hover:underline break-words">
                  {r.isPinned && <Pin size={14} className="mr-1.5 inline -mt-0.5 text-indigo-300" aria-label={t('pinnedAria')} />}
                  {r.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>
                    {published ? t('published') : t('draft')}
                  </span>
                  <span>{published ? t('publishedOn', { date: formatDate(r.publishedAt as string, locale) }) : t('createdOn', { date: formatDate(r.createdAt, locale) })}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {published ? (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => run(r.id, () => supabase().from('announcements').update({ published_at: null }).eq('id', r.id), t('errUnpublish'))}
                    className={cn(btn, 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200')}
                  >
                    {t('unpublish')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => run(r.id, () => supabase().rpc('publish_announcement', { p_id: r.id, p_notify: false }), t('errPublish'))}
                      className={cn(btn, 'bg-indigo-600 hover:bg-indigo-500 text-white')}
                    >
                      {t('publish')}
                    </button>
                    {emailEnabled && (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={async () => {
                          setError(null)
                          setNotice(null)
                          setBusyId(r.id)
                          const res = await publishWithNotify('announcement', r.id, true)
                          setBusyId(null)
                          if (!res.ok) return setError(text.failure(res.error))
                          setNotice(text.notice(res.notification))
                          router.refresh()
                        }}
                        className={cn(btn, 'bg-white/5 hover:bg-white/10 border border-indigo-500/40 text-indigo-200')}
                      >
                        {t('publishNotify')}
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => run(r.id, () => supabase().from('announcements').update({ is_pinned: !r.isPinned }).eq('id', r.id), t('errPin'))}
                  className={cn(btn, 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200')}
                >
                  {r.isPinned ? t('unpin') : t('pin')}
                </button>
                <Link href={`/admin/announcements/${r.id}/edit`} className={cn(btn, 'inline-flex items-center bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200')}>
                  {t('edit')}
                </Link>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => {
                    if (!window.confirm(t('confirmDelete', { title: r.title }))) return
                    void run(r.id, () => supabase().from('announcements').delete().eq('id', r.id), t('errDelete'))
                  }}
                  className={cn(btn, 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300')}
                >
                  {t('delete')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
