'use client'

// Design Ref: §5.4 /admin/resources — 자료 목록(공개/미공개), 공개·비공개·수정·삭제, 일괄 공개(알림 없음).
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import type { Category } from '@/features/library/params'
import { publishWithNotify, type NotificationResult } from '../publishClient'
import { useNoticeText } from '../useNoticeText'

export interface AdminResourceRow {
  id: string
  title: string
  cohortNumber: number | null
  category: Category
  isPublished: boolean
  downloadCount: number
  createdAt: string
  storagePath: string | null
}

type StatusFilter = 'all' | 'published' | 'draft'

const BULK_CONCURRENCY = 8

export function ResourceAdminTable({ rows, emailEnabled = false, initialNotice = null }: { rows: AdminResourceRow[]; emailEnabled?: boolean; initialNotice?: NotificationResult | null }) {
  const t = useTranslations('admin.resources')
  const tc = useTranslations('common')
  const tl = useTranslations('library')
  const locale = useLocale()
  const text = useNoticeText()
  const router = useRouter()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(() => text.notice(initialNotice))
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const counts = useMemo(() => ({ all: rows.length, published: rows.filter((r) => r.isPublished).length, draft: rows.filter((r) => !r.isPublished).length }), [rows])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => (status === 'all' || (status === 'published') === r.isPublished) && (!q || r.title.toLowerCase().includes(q)))
  }, [rows, status, query])

  const run = async (id: string, action: () => Promise<{ message?: string } | null>) => {
    setError(null)
    setNotice(null)
    setBusyId(id)
    const failure = await action()
    setBusyId(null)
    if (failure?.message) setError(failure.message)
    else router.refresh()
  }

  const publish = (id: string) =>
    run(id, async () => {
      // 알림 없이 공개한다. 이메일 알림은 알림 기능(이후 단계)이 준비된 뒤 켠다.
      const { error: e } = await createClient().rpc('publish_resource', { p_id: id, p_notify: false })
      return e ? { message: t('errPublish') } : null
    })

  // 공개 + 이메일 알림. 서버가 발송까지 처리하고 결과를 돌려준다.
  const publishAndNotify = (id: string) =>
    run(id, async () => {
      const r = await publishWithNotify('resource', id, true)
      if (!r.ok) return { message: text.failure(r.error) }
      setNotice(text.notice(r.notification))
      return null
    })

  const unpublish = (id: string) =>
    run(id, async () => {
      const { error: e } = await createClient().from('resources').update({ is_published: false }).eq('id', id)
      return e ? { message: t('errPrivate') } : null
    })

  const remove = (row: AdminResourceRow) => {
    if (!window.confirm(t('confirmDelete', { title: row.title }))) return
    return run(row.id, async () => {
      const supabase = createClient()
      const { error: e } = await supabase.from('resources').delete().eq('id', row.id)
      if (e) return { message: t('errDelete') }
      if (row.storagePath) await supabase.storage.from('resources').remove([row.storagePath]) // 실패해도 행은 이미 삭제됨
      return null
    })
  }

  const bulkPublish = async () => {
    const ids = Array.from(selected).filter((id) => rows.find((r) => r.id === id && !r.isPublished))
    if (ids.length === 0) return setError(t('errNoneSelected'))
    setError(null)
    setNotice(null)
    setBusyId('bulk')
    setProgress({ done: 0, total: ids.length })
    const supabase = createClient()
    let done = 0
    let failed = 0
    // 드라이브 이전처럼 수백 건을 한 번에 공개할 수 있도록 8건씩 병렬로 처리한다
    for (let i = 0; i < ids.length; i += BULK_CONCURRENCY) {
      const chunk = ids.slice(i, i + BULK_CONCURRENCY)
      const results = await Promise.all(chunk.map((id) => supabase.rpc('publish_resource', { p_id: id, p_notify: false })))
      for (const r of results) {
        if (r.error) failed += 1
        else done += 1
      }
      setProgress({ done: done + failed, total: ids.length })
    }
    setBusyId(null)
    setProgress(null)
    setSelected(new Set())
    if (failed > 0) setError(t('errBulkFailed', { count: failed }))
    if (done > 0) setNotice(t('bulkDone', { count: done }))
    router.refresh()
  }

  // 지금 보이는 목록 중 미공개 자료만 전체 선택 대상이다 (검수 후 한 번에 공개)
  const selectableIds = useMemo(() => visible.filter((r) => !r.isPublished).map((r) => r.id), [visible])
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const btn = 'min-h-11 px-4 rounded-xl text-sm font-medium disabled:opacity-50'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['all', t('tabAll', { count: counts.all })],
            ['published', t('tabPublished', { count: counts.published })],
            ['draft', t('tabDraft', { count: counts.draft })],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={status === key}
            onClick={() => setStatus(key)}
            className={cn('min-h-11 px-4 rounded-full text-base font-medium', status === key ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10')}
          >
            {text}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchAria')}
          className="min-h-11 flex-1 min-w-40 bg-white/5 border border-white/10 rounded-xl px-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
        />
      </div>

      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm px-4 py-3 rounded-xl">
          {notice}
        </div>
      )}

      {selectableIds.length > 0 && (
        <label className="flex items-center gap-3 min-h-11 text-base text-gray-200 cursor-pointer">
          <input
            type="checkbox"
            data-testid="select-all-drafts"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(selectableIds))}
            className="h-5 w-5 accent-green-500"
          />
          {t('selectDrafts', { count: selectableIds.length })}
        </label>
      )}

      {selected.size > 0 && (
        <button type="button" onClick={bulkPublish} disabled={busyId !== null} className={cn(btn, 'bg-green-600 hover:bg-green-500 text-white text-base font-semibold px-5 min-h-12')}>
          {busyId === 'bulk' && <Loader2 size={16} className="inline animate-spin mr-2" aria-hidden />}
          {progress ? t('bulkProgress', { done: progress.done, total: progress.total }) : t('bulkPublish', { count: selected.size })}
        </button>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-base text-gray-400" data-testid="admin-resources-empty">
          {rows.length === 0 ? t('empty') : t('noMatch')}
        </p>
      ) : (
        <ul className="space-y-3" data-testid="admin-resources-list">
          {visible.map((r) => (
            <li key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <input type="checkbox" aria-label={t('selectAria', { title: r.title })} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="mt-1.5 h-5 w-5 accent-green-500" />
                <div className="min-w-0 flex-1">
                  <Link href={`/library/${r.id}`} className="text-base font-semibold text-white hover:underline break-words">
                    {r.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', r.isPublished ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>
                      {r.isPublished ? t('published') : t('draft')}
                    </span>
                    <span>{r.cohortNumber !== null ? tc('cohort', { number: r.cohortNumber }) : t('common')}</span>
                    <span>· {tl(`categories.${r.category}`)}</span>
                    <span>· {t('downloads', { count: r.downloadCount })}</span>
                    <span>· {formatDate(r.createdAt, locale)}</span>
                    {!r.storagePath && <span>· {t('link')}</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pl-8">
                {r.isPublished ? (
                  <button type="button" onClick={() => unpublish(r.id)} disabled={busyId !== null} className={cn(btn, 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200')}>
                    {t('makePrivate')}
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => publish(r.id)} disabled={busyId !== null} className={cn(btn, 'bg-green-600 hover:bg-green-500 text-white')}>
                      {busyId === r.id ? <Loader2 size={14} className="inline animate-spin" aria-hidden /> : t('publish')}
                    </button>
                    {emailEnabled && (
                      <button type="button" onClick={() => publishAndNotify(r.id)} disabled={busyId !== null} className={cn(btn, 'bg-white/5 hover:bg-white/10 border border-green-500/40 text-green-200')}>
                        {t('publishNotify')}
                      </button>
                    )}
                  </>
                )}
                <Link href={`/admin/resources/${r.id}/edit`} className={cn(btn, 'inline-flex items-center bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200')}>
                  {t('edit')}
                </Link>
                <button type="button" onClick={() => remove(r)} disabled={busyId !== null} className={cn(btn, 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300')}>
                  {t('delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
