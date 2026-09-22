'use client'

// Design Ref: §5.4 /pending — 명단 미등록자의 신청 정보 제출. profiles 의 허용 컬럼(name, company, requested_cohort)만 수정한다.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initial: { name: string; requestedCohort: number | null; company: string }
}

type FormError = 'errName' | 'errCohort' | 'errExpired' | 'errSave'

const inputClass =
  'w-full min-h-12 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors'

/** "12", "12기", "Cohort 12" 모두 12 로 읽는다 */
export function parseCohortInput(raw: string): number {
  return Number(raw.replace(/기$/, '').replace(/^cohort\s*/i, '').trim()) // i18n-ignore: 한국어 접미사 입력도 허용
}

export function PendingForm({ initial }: Props) {
  const t = useTranslations('auth.pending.form')
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [cohort, setCohort] = useState(initial.requestedCohort ? String(initial.requestedCohort) : '')
  const [company, setCompany] = useState(initial.company)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<FormError | null>(null)
  const [saved, setSaved] = useState(initial.requestedCohort !== null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cohortNumber = parseCohortInput(cohort)
    if (!name.trim()) return setError('errName')
    if (!Number.isInteger(cohortNumber) || cohortNumber < 1 || cohortNumber > 99) return setError('errCohort')

    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      return setError('errExpired')
    }
    const { error: err } = await supabase
      .from('profiles')
      .update({ name: name.trim(), company: company.trim() || null, requested_cohort: cohortNumber })
      .eq('id', user.id)
    setBusy(false)

    if (err) return setError('errSave')
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="pending-form">
      {saved && (
        <div role="status" className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm px-4 py-3 rounded-xl">
          {t('saved')}
        </div>
      )}
      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {t(error)}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
          {t('name')}
        </label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="cohort" className="block text-sm font-medium text-gray-300 mb-2">
          {t('cohort')}
        </label>
        <input
          id="cohort"
          value={cohort}
          onChange={(e) => setCohort(e.target.value)}
          inputMode="numeric"
          placeholder={t('cohortPlaceholder')}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
          {t('company')} <span className="text-gray-500 font-normal">{t('optional')}</span>
        </label>
        <input id="company" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full min-h-12 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-base font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {busy && <Loader2 size={18} className="animate-spin" />}
        {saved ? t('resubmit') : t('submit')}
      </button>
    </form>
  )
}
