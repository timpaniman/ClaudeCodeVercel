'use client'

// Design Ref: §5.4 /admin/announcements — 공지 목록(게시/임시저장), 게시·게시 취소·고정·수정·삭제.
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { describeNotification, publishWithNotify } from '../publishClient'

export interface AdminAnnouncementRow {
  id: string
  title: string
  isPinned: boolean
  publishedAt: string | null
  createdAt: string
}

export function AnnouncementAdminList({ rows, emailEnabled = false, initialNotice = null }: { rows: AdminAnnouncementRow[]; emailEnabled?: boolean; initialNotice?: string | null }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(initialNotice)

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
        작성한 공지가 없습니다. 위의 공지 작성 버튼으로 첫 공지를 올려 주세요.
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
                  {r.isPinned && <Pin size={14} className="mr-1.5 inline -mt-0.5 text-indigo-300" aria-label="고정" />}
                  {r.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>
                    {published ? '게시됨' : '임시저장'}
                  </span>
                  <span>{published ? `게시 ${formatDate(r.publishedAt as string)}` : `작성 ${formatDate(r.createdAt)}`}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {published ? (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => run(r.id, () => supabase().from('announcements').update({ published_at: null }).eq('id', r.id), '게시를 취소하지 못했습니다.')}
                    className={cn(btn, 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200')}
                  >
                    게시 취소
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => run(r.id, () => supabase().rpc('publish_announcement', { p_id: r.id, p_notify: false }), '게시하지 못했습니다.')}
                      className={cn(btn, 'bg-indigo-600 hover:bg-indigo-500 text-white')}
                    >
                      게시
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
                          if (!res.ok) return setError(res.error)
                          setNotice(describeNotification(res.notification))
                          router.refresh()
                        }}
                        className={cn(btn, 'bg-white/5 hover:bg-white/10 border border-indigo-500/40 text-indigo-200')}
                      >
                        게시 + 알림
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => run(r.id, () => supabase().from('announcements').update({ is_pinned: !r.isPinned }).eq('id', r.id), '고정 상태를 바꾸지 못했습니다.')}
                  className={cn(btn, 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200')}
                >
                  {r.isPinned ? '고정 해제' : '상단 고정'}
                </button>
                <Link href={`/admin/announcements/${r.id}/edit`} className={cn(btn, 'inline-flex items-center bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200')}>
                  수정
                </Link>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => {
                    if (!window.confirm(`"${r.title}" 공지를 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return
                    void run(r.id, () => supabase().from('announcements').delete().eq('id', r.id), '삭제하지 못했습니다.')
                  }}
                  className={cn(btn, 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300')}
                >
                  삭제
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
