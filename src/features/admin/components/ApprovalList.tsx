'use client'

// Design Ref: §5.4 /admin/approvals — 승인 대기 큐. admin_set_member_status RPC 로 승인/거절한다 (DB가 운영진 여부를 검사).
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { cn, formatRelativeTime } from '@/lib/utils'

export interface ApprovalItem {
  id: string
  email: string
  name: string
  company: string | null
  requestedCohort: number | null
  status: 'pending' | 'rejected'
  createdAt: string
}

interface Cohort {
  id: number
  number: number
}

export function ApprovalList({ items, cohorts }: { items: ApprovalItem[]; cohorts: Cohort[] }) {
  const t = useTranslations('admin.approvals')
  const tc = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const [tab, setTab] = useState<'pending' | 'rejected'>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const cohortIdByNumber = useMemo(() => new Map(cohorts.map((c) => [c.number, c.id])), [cohorts])
  // 항목별로 선택한 기수(cohorts.id). 기본값은 신청한 기수 번호에 해당하는 기수
  const [cohortChoice, setCohortChoice] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.requestedCohort ? String(cohortIdByNumber.get(i.requestedCohort) ?? '') : ''])),
  )

  const list = items.filter((i) => i.status === tab)
  const pendingCount = items.filter((i) => i.status === 'pending').length
  const rejectedCount = items.length - pendingCount

  const setStatus = async (id: string, status: 'active' | 'rejected'): Promise<boolean> => {
    const cohortId = cohortChoice[id]
    if (status === 'active' && !cohortId) {
      setError(t('errChooseCohort'))
      return false
    }
    const supabase = createClient()
    const { error: err } = await supabase.rpc('admin_set_member_status', {
      p_user: id,
      p_status: status,
      ...(status === 'active' ? { p_cohort: Number(cohortId) } : {}),
    })
    if (err) {
      setError(err.code === '42501' ? t('errAdminOnly') : t('errGeneric'))
      return false
    }
    return true
  }

  const act = async (id: string, status: 'active' | 'rejected') => {
    setError(null)
    setBusyId(id)
    const ok = await setStatus(id, status)
    setBusyId(null)
    if (ok) router.refresh()
  }

  const bulkApprove = async () => {
    setError(null)
    setBusyId('bulk')
    for (const id of Array.from(selected)) {
      if (!(await setStatus(id, 'active'))) break
    }
    setBusyId(null)
    setSelected(new Set())
    router.refresh()
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-2">
        {(
          [
            ['pending', t('tabPending', { count: pendingCount })],
            ['rejected', t('tabRejected', { count: rejectedCount })],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key)
              setSelected(new Set())
            }}
            className={cn('min-h-11 px-4 rounded-full text-base font-medium', tab === key ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10')}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {tab === 'pending' && selected.size > 0 && (
        <button
          onClick={bulkApprove}
          disabled={busyId !== null}
          className="min-h-12 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-base font-semibold"
        >
          {busyId === 'bulk' && <Loader2 size={16} className="inline animate-spin mr-2" />}
          {t('approveSelected', { count: selected.size })}
        </button>
      )}

      {list.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-base text-gray-400" data-testid="approvals-empty">
          {tab === 'pending' ? t('emptyPending') : t('emptyRejected')}
        </p>
      ) : (
        <ul className="space-y-3" data-testid="approvals-list">
          {list.map((p) => (
            <li key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                {tab === 'pending' && (
                  <input
                    type="checkbox"
                    aria-label={t('selectAria', { name: p.name })}
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="mt-1 h-5 w-5 accent-indigo-500"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-white">{p.name}</div>
                  <div className="text-sm text-gray-300 break-all">{p.email}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {p.company ? `${p.company} · ` : ''}
                    {t('requested', { cohort: p.requestedCohort ? tc('cohort', { number: p.requestedCohort }) : t('notEntered') })} · {formatRelativeTime(p.createdAt, locale)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <label className="sr-only" htmlFor={`cohort-${p.id}`}>
                  {t('chooseCohort')}
                </label>
                <select
                  id={`cohort-${p.id}`}
                  value={cohortChoice[p.id] ?? ''}
                  onChange={(e) => setCohortChoice((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="min-h-11 bg-gray-900 border border-white/15 rounded-xl px-3 text-base text-white"
                >
                  <option value="">{t('chooseCohort')}</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {tc('cohort', { number: c.number })}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => act(p.id, 'active')}
                  disabled={busyId !== null}
                  className="min-h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-base font-semibold"
                >
                  {busyId === p.id ? <Loader2 size={16} className="animate-spin" /> : t('approve')}
                </button>
                {tab === 'pending' && (
                  <button
                    onClick={() => act(p.id, 'rejected')}
                    disabled={busyId !== null}
                    className="min-h-11 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-gray-200 text-base font-medium"
                  >
                    {t('reject')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
