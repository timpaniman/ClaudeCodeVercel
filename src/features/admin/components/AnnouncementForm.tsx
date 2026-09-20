'use client'

// Design Ref: §5.4 /admin/announcements/new — 제목·본문(마크다운)·상단 고정·미리보기·임시저장/게시.
// 이메일 발송은 알림 기능(이후 단계)이 준비되기 전까지 비활성이다 (게시는 항상 p_notify=false).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { MarkdownBody } from '@/features/announcements/components/MarkdownBody'
import { MAX_BODY_LENGTH, MAX_TITLE_LENGTH, validateAnnouncement } from '@/features/announcements/text'
import { noticeQuery, publishWithNotify } from '../publishClient'

export interface AnnouncementFormInitial {
  id: string
  title: string
  body: string
  isPinned: boolean
  publishedAt: string | null
}

const field =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

export function AnnouncementForm({ userId, initial, emailEnabled = false }: { userId: string; initial?: AnnouncementFormInitial; emailEnabled?: boolean }) {
  const router = useRouter()
  const isEdit = !!initial
  const isPublished = initial?.publishedAt != null

  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [pinned, setPinned] = useState(initial?.isPinned ?? false)
  const [notify, setNotify] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [busy, setBusy] = useState<null | 'save' | 'publish' | 'unpublish'>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async (action: 'save' | 'publish') => {
    if (busy) return
    setError(null)
    const problem = validateAnnouncement({ title, body })
    if (problem) return setError(problem)

    setBusy(action)
    const supabase = createClient()
    const fields = { title: title.trim(), body, is_pinned: pinned }
    let id = initial?.id

    if (initial) {
      const { error: e } = await supabase.from('announcements').update(fields).eq('id', initial.id)
      if (e) {
        setBusy(null)
        return setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } else {
      const { data, error: e } = await supabase.from('announcements').insert({ author_id: userId, ...fields }).select('id').single()
      if (e || !data) {
        setBusy(null)
        return setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
      id = data.id
    }

    let query = ''
    if (action === 'publish' && !isPublished && id) {
      let failed = false
      if (notify && emailEnabled) {
        // 게시 + 이메일 알림 (서버가 발송까지 처리한다)
        const r = await publishWithNotify('announcement', id, true)
        failed = !r.ok
        if (r.ok) query = noticeQuery(r.notification)
      } else {
        const { error: e } = await supabase.rpc('publish_announcement', { p_id: id, p_notify: false })
        failed = !!e
      }
      if (failed) {
        setBusy(null)
        setError('임시저장은 됐지만 게시하지 못했습니다. 목록에서 "게시"를 눌러 주세요.')
        router.refresh()
        return
      }
    }
    router.push(`/admin/announcements${query}`)
    router.refresh()
  }

  const unpublish = async () => {
    if (!initial || busy) return
    setError(null)
    setBusy('unpublish')
    const { error: e } = await createClient().from('announcements').update({ published_at: null }).eq('id', initial.id)
    if (e) {
      setBusy(null)
      return setError('게시를 취소하지 못했습니다.')
    }
    router.push('/admin/announcements')
    router.refresh()
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6" data-testid="announcement-form" noValidate>
      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-base px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
          제목
        </label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MAX_TITLE_LENGTH} className={cn(field, 'min-h-12')} placeholder="예: 17기 8주차 자료가 올라왔습니다" />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="body" className="text-sm font-medium text-gray-300">
            내용 <span className="text-gray-500 font-normal">(마크다운: **굵게**, - 목록, [링크](https://…))</span>
          </label>
          <div role="tablist" className="flex gap-1">
            {(['edit', 'preview'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn('min-h-11 px-4 rounded-full text-sm font-medium', tab === t ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10')}
              >
                {t === 'edit' ? '작성' : '미리보기'}
              </button>
            ))}
          </div>
        </div>

        {tab === 'edit' ? (
          <>
            <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={14} className={cn(field, 'resize-y leading-relaxed')} />
            <p className="mt-1 text-right text-sm text-gray-500">
              {body.length.toLocaleString('ko-KR')} / {MAX_BODY_LENGTH.toLocaleString('ko-KR')}자
            </p>
          </>
        ) : (
          <div className="min-h-48 rounded-xl border border-white/10 bg-white/5 p-4" data-testid="announcement-preview">
            {body.trim() ? <MarkdownBody source={body} /> : <p className="text-gray-500">미리볼 내용이 없습니다.</p>}
          </div>
        )}
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <legend className="px-1 text-sm font-medium text-gray-300">게시 설정</legend>
        <label className="flex items-center gap-3 min-h-11 text-base text-gray-200 cursor-pointer">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-5 w-5 accent-indigo-500" />
          상단에 고정
        </label>
        <label className={`flex items-center gap-3 min-h-11 text-base ${emailEnabled && !isPublished ? 'text-gray-200 cursor-pointer' : 'text-gray-500'}`}>
          <input
            type="checkbox"
            data-testid="notify-checkbox"
            checked={notify && emailEnabled && !isPublished}
            disabled={!emailEnabled || isPublished}
            onChange={(e) => setNotify(e.target.checked)}
            className="h-5 w-5 accent-indigo-500"
          />
          게시할 때 이메일 알림 발송
          {!emailEnabled ? ' (이메일 서비스 설정 전)' : isPublished ? ' (이미 게시된 공지)' : ''}
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        {isPublished ? (
          <>
            <button type="button" onClick={() => save('save')} disabled={!!busy} className="inline-flex items-center gap-2 min-h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-base font-semibold">
              {busy === 'save' && <Loader2 size={18} className="animate-spin" aria-hidden />} 저장
            </button>
            <button type="button" onClick={unpublish} disabled={!!busy} className="min-h-12 px-5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-base font-medium text-gray-100">
              {busy === 'unpublish' ? '처리 중…' : '게시 취소(임시저장으로)'}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => save('publish')} disabled={!!busy} className="inline-flex items-center gap-2 min-h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-base font-semibold">
              {busy === 'publish' && <Loader2 size={18} className="animate-spin" aria-hidden />} 게시
            </button>
            <button type="button" onClick={() => save('save')} disabled={!!busy} className="inline-flex items-center gap-2 min-h-12 px-5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-base font-medium text-gray-100">
              {busy === 'save' && <Loader2 size={18} className="animate-spin" aria-hidden />} 임시저장
            </button>
          </>
        )}
        <button type="button" onClick={() => router.push('/admin/announcements')} disabled={!!busy} className="min-h-12 px-4 text-base text-gray-400 hover:text-white disabled:opacity-50">
          {isEdit ? '취소' : '목록으로'}
        </button>
      </div>
    </form>
  )
}
