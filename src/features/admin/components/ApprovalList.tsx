'use client'

// Design Ref: §5.4 /admin/approvals — 승인 대기 큐. admin_set_member_status RPC 로 승인/거절한다 (DB가 운영진 여부를 검사).
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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
      setError('승인하려면 기수를 선택해 주세요.')
      return false
    }
    const supabase = createClient()
    const { error: err } = await supabase.rpc('admin_set_member_status', {
      p_user: id,
      p_status: status,
      ...(status === 'active' ? { p_cohort: Number(cohortId) } : {}),
    })
    if (err) {
      setError(err.code === '42501' ? '운영진만 처리할 수 있습니다.' : '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
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
            ['pending', `대기 ${pendingCount}`],
            ['rejected', `거절됨 ${rejectedCount}`],
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
          선택한 {selected.size}명 승인
        </button>
      )}

      {list.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-base text-gray-400" data-testid="approvals-empty">
          {tab === 'pending' ? '승인 대기 중인 분이 없습니다.' : '거절한 분이 없습니다.'}
        </p>
      ) : (
        <ul className="space-y-3" data-testid="approvals-list">
          {list.map((p) => (
            <li key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                {tab === 'pending' && (
                  <input
                    type="checkbox"
                    aria-label={`${p.name} 선택`}
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
                    신청 기수 {p.requestedCohort ? `${p.requestedCohort}기` : '미입력'} · {formatRelativeTime(p.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <label className="sr-only" htmlFor={`cohort-${p.id}`}>
                  기수 선택
                </label>
                <select
                  id={`cohort-${p.id}`}
                  value={cohortChoice[p.id] ?? ''}
                  onChange={(e) => setCohortChoice((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="min-h-11 bg-gray-900 border border-white/15 rounded-xl px-3 text-base text-white"
                >
                  <option value="">기수 선택</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.number}기
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => act(p.id, 'active')}
                  disabled={busyId !== null}
                  className="min-h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-base font-semibold"
                >
                  {busyId === p.id ? <Loader2 size={16} className="animate-spin" /> : '승인'}
                </button>
                {tab === 'pending' && (
                  <button
                    onClick={() => act(p.id, 'rejected')}
                    disabled={busyId !== null}
                    className="min-h-11 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-gray-200 text-base font-medium"
                  >
                    거절
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
