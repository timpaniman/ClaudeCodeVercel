'use client'

// Design Ref: §5.4 /admin/roster — CSV 업로드 → 검증 미리보기 → 확정, 등록된 명단 조회.
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RosterSummary, ValidatedRosterRow } from '../services/roster'

export interface RosterEntry {
  email: string
  name: string
  cohortNumber: number
  role: 'member' | 'admin'
  joined: boolean
}

interface Preview {
  summary: RosterSummary
  hasAdminRows: boolean
  rows: ValidatedRosterRow[]
}

interface CommitResult {
  inserted: number
  updated: number
  skipped: number
  activated: number
}

const STATUS_LABEL: Record<ValidatedRosterRow['status'], { text: string; className: string }> = {
  ok: { text: '신규', className: 'bg-emerald-500/15 text-emerald-300' },
  already_in_roster: { text: '기존', className: 'bg-amber-500/15 text-amber-300' },
  duplicate_in_file: { text: '중복', className: 'bg-gray-500/20 text-gray-300' },
  invalid: { text: '오류', className: 'bg-red-500/15 text-red-300' },
}

async function readError(res: Response): Promise<string> {
  try {
    const j = await res.json()
    return j?.error?.message ?? '일시적인 오류입니다. 잠시 후 다시 시도해 주세요.'
  } catch {
    return '일시적인 오류입니다. 잠시 후 다시 시도해 주세요.'
  }
}

export function RosterManager({ entries }: { entries: RosterEntry[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [fileName, setFileName] = useState('')
  const [confirmAdmin, setConfirmAdmin] = useState(false)
  const [result, setResult] = useState<CommitResult | null>(null)
  const [query, setQuery] = useState('')

  const importable = useMemo(
    () => (preview?.rows ?? []).filter((r) => r.status === 'ok' || r.status === 'already_in_roster'),
    [preview],
  )

  const upload = async (file: File) => {
    setError(null)
    setResult(null)
    setPreview(null)
    setConfirmAdmin(false)
    setFileName(file.name)
    setBusy(true)
    try {
      const form = new FormData()
      form.set('file', file)
      const res = await fetch('/api/admin/roster/preview', { method: 'POST', body: form })
      if (!res.ok) return setError(await readError(res))
      setPreview(await res.json())
    } catch {
      setError('네트워크 오류입니다. 연결을 확인하고 다시 시도해 주세요.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const commit = async () => {
    if (!preview) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/admin/roster/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: importable.map((r) => ({ email: r.email, name: r.name, cohort_number: r.cohortNumber, role: r.role })),
          confirmAdminRows: confirmAdmin,
        }),
      })
      if (!res.ok) return setError(await readError(res))
      const json = await res.json()
      setResult(json.result as CommitResult)
      setPreview(null)
      router.refresh()
    } catch {
      setError('네트워크 오류입니다. 연결을 확인하고 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) => e.email.includes(q) || e.name.toLowerCase().includes(q) || `${e.cohortNumber}기`.includes(q))
  }, [entries, query])

  const canCommit = !!preview && importable.length > 0 && (!preview.hasAdminRows || confirmAdmin) && !busy

  return (
    <div className="space-y-8">
      {/* 업로드 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-white">명단 CSV 등록</h2>
          <a href="/roster-template.csv" download className="inline-flex items-center gap-2 min-h-11 text-sm text-indigo-300 hover:text-indigo-200">
            <Download size={16} /> 양식 내려받기
          </a>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const f = e.dataTransfer.files?.[0]
            if (f) void upload(f)
          }}
          className={cn(
            'rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
            dragging ? 'border-indigo-400 bg-indigo-600/10' : 'border-white/15 bg-white/5',
          )}
        >
          <FileUp className="mx-auto mb-3 text-gray-400" size={28} />
          <p className="text-base text-gray-200">CSV 파일을 여기로 끌어오거나</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-3 min-h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-base font-semibold"
          >
            파일 선택
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            data-testid="roster-file"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void upload(f)
            }}
          />
          <p className="text-sm text-gray-500 mt-3">열: email(이메일), name(이름), cohort_number(기수), role(선택: member/admin)</p>
        </div>

        {busy && (
          <div className="flex items-center gap-2 text-gray-300" role="status">
            <Loader2 className="animate-spin" size={18} /> 처리 중…
          </div>
        )}
        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        {result && (
          <div role="status" data-testid="roster-result" className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-xl flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <div className="text-base">
              등록을 마쳤습니다. 신규 {result.inserted}명 · 갱신 {result.updated}명 · 이미 가입 {result.skipped}명(수정 안 함)
              {result.activated > 0 && ` · 승인 대기 중이던 ${result.activated}명 자동 승인`}
            </div>
          </div>
        )}
      </section>

      {/* 미리보기 */}
      {preview && (
        <section className="space-y-4" data-testid="roster-preview">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-white">미리보기</h2>
            <span className="text-sm text-gray-400">{fileName}</span>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {[
              ['전체', preview.summary.total, 'bg-white/10 text-gray-200'],
              ['신규', preview.summary.ok, STATUS_LABEL.ok.className],
              ['기존', preview.summary.alreadyInRoster, STATUS_LABEL.already_in_roster.className],
              ['중복', preview.summary.duplicateInFile, STATUS_LABEL.duplicate_in_file.className],
              ['오류', preview.summary.invalid, STATUS_LABEL.invalid.className],
            ].map(([label, n, cls]) => (
              <span key={label as string} className={cn('rounded-full px-3 py-1 font-medium', cls as string)}>
                {label} {n}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-medium">줄</th>
                  <th className="px-3 py-2 font-medium">상태</th>
                  <th className="px-3 py-2 font-medium">이메일</th>
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">기수</th>
                  <th className="px-3 py-2 font-medium">역할</th>
                  <th className="px-3 py-2 font-medium">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {preview.rows.map((r) => (
                  <tr key={`${r.line}-${r.email}`} className={r.status === 'invalid' ? 'bg-red-500/5' : undefined}>
                    <td className="px-3 py-2 text-gray-500">{r.line}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_LABEL[r.status].className)}>
                        {STATUS_LABEL[r.status].text}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-200 break-all">{r.email}</td>
                    <td className="px-3 py-2 text-gray-200">{r.name}</td>
                    <td className="px-3 py-2 text-gray-200">{r.cohortNumber ? `${r.cohortNumber}기` : '-'}</td>
                    <td className="px-3 py-2 text-gray-200">{r.role === 'admin' ? '운영진' : '회원'}</td>
                    <td className="px-3 py-2 text-gray-400">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.hasAdminRows && (
            <label className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-base text-amber-100 cursor-pointer">
              <AlertTriangle className="mt-0.5 shrink-0" size={20} />
              <span className="flex-1">
                <span className="block font-semibold">운영진 권한이 부여되는 행이 있습니다.</span>
                <span className="block text-sm text-amber-200/80 mt-1">이 이메일로 로그인하면 모든 자료·명단을 관리할 수 있습니다. 맞는 사람인지 확인해 주세요.</span>
                <span className="mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={confirmAdmin} onChange={(e) => setConfirmAdmin(e.target.checked)} className="h-5 w-5 accent-amber-500" />
                  확인했습니다
                </span>
              </span>
            </label>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={commit}
              disabled={!canCommit}
              className="min-h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base font-semibold"
            >
              {importable.length}명 확정
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null)
                setError(null)
              }}
              className="min-h-12 px-4 text-base text-gray-400 hover:text-white"
            >
              취소
            </button>
            <span className="text-sm text-gray-500">오류·중복 행은 확정에서 제외됩니다.</span>
          </div>
        </section>
      )}

      {/* 등록된 명단 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-white">
            등록된 명단 <span className="text-gray-500 font-normal text-base">{entries.length}명</span>
          </h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·이메일·기수 검색"
            aria-label="명단 검색"
            className="min-h-11 w-full sm:w-72 bg-white/5 border border-white/10 rounded-xl px-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {entries.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-base text-gray-400">
            아직 등록된 명단이 없습니다. 위에서 CSV를 올려 주세요.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm" data-testid="roster-table">
              <thead className="bg-white/5 text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">이메일</th>
                  <th className="px-3 py-2 font-medium">기수</th>
                  <th className="px-3 py-2 font-medium">역할</th>
                  <th className="px-3 py-2 font-medium">가입</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.slice(0, 500).map((e) => (
                  <tr key={e.email}>
                    <td className="px-3 py-2 text-gray-200">{e.name}</td>
                    <td className="px-3 py-2 text-gray-300 break-all">{e.email}</td>
                    <td className="px-3 py-2 text-gray-200">{e.cohortNumber}기</td>
                    <td className="px-3 py-2 text-gray-300">{e.role === 'admin' ? '운영진' : '회원'}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', e.joined ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/20 text-gray-300')}>
                        {e.joined ? '가입 완료' : '미가입'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 500 && <p className="px-3 py-2 text-sm text-gray-500">검색으로 범위를 좁혀 주세요. (상위 500명만 표시)</p>}
            {filtered.length === 0 && <p className="px-3 py-4 text-sm text-gray-500">검색 결과가 없습니다.</p>}
          </div>
        )}
      </section>
    </div>
  )
}
