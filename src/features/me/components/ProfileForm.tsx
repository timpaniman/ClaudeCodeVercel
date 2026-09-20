'use client'

// Design Ref: §5.4 /me — 프로필 편집. profiles 의 지정 컬럼만 수정한다(role/status/cohort/email 은 DB 컬럼 권한이 막는다).
// 사진 업로드는 v1.1 (아바타 저장소·정책이 별도로 필요). 지금은 이름의 첫 글자 아바타를 쓴다.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PROFILE_LIMITS, validateProfile, type ProfileField, type ProfileInput } from '../profile'

const inputClass =
  'w-full min-h-12 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

interface FieldSpec {
  name: ProfileField
  label: string
  placeholder?: string
  autoComplete?: string
  multiline?: boolean
  inputMode?: 'url'
  hint?: string
}

const FIELDS: FieldSpec[] = [
  { name: 'name', label: '이름', autoComplete: 'name' },
  { name: 'company', label: '회사', autoComplete: 'organization' },
  { name: 'position', label: '직책', autoComplete: 'organization-title', placeholder: '예: 대표이사' },
  { name: 'bio', label: '소개', multiline: true, hint: '다른 졸업생에게 보이는 한두 줄 소개입니다.' },
  { name: 'github_url', label: 'GitHub', placeholder: 'https://github.com/…', inputMode: 'url' },
  { name: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/…', inputMode: 'url' },
  { name: 'website_url', label: '웹사이트', placeholder: 'https://…', inputMode: 'url' },
]

export function ProfileForm({ userId, initial }: { userId: string; initial: ProfileInput }) {
  const router = useRouter()
  const [values, setValues] = useState<ProfileInput>(initial)
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const set = (name: ProfileField, v: string) => {
    setValues((prev) => ({ ...prev, [name]: v }))
    setMessage(null)
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setMessage(null)

    const v = validateProfile(values)
    if (!v.ok) {
      setErrors(v.errors)
      return setMessage({ kind: 'error', text: '입력 내용을 확인해 주세요.' })
    }
    setErrors({})

    setBusy(true)
    const { error } = await createClient().from('profiles').update(v.value).eq('id', userId)
    setBusy(false)
    if (error) return setMessage({ kind: 'error', text: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' })

    setMessage({ kind: 'ok', text: '저장했습니다.' })
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-5" data-testid="profile-form" noValidate>
      {FIELDS.map((f) => {
        const id = `profile-${f.name}`
        const err = errors[f.name]
        const common = {
          id,
          value: values[f.name],
          'aria-invalid': err ? true : undefined,
          'aria-describedby': err ? `${id}-error` : undefined,
          className: inputClass,
          placeholder: f.placeholder,
        }
        return (
          <div key={f.name}>
            <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
              {f.label}
            </label>
            {f.multiline ? (
              <textarea {...common} rows={4} maxLength={PROFILE_LIMITS.bio} onChange={(e) => set(f.name, e.target.value)} className={`${inputClass} resize-y`} />
            ) : (
              <input {...common} autoComplete={f.autoComplete} inputMode={f.inputMode} onChange={(e) => set(f.name, e.target.value)} />
            )}
            {f.hint && !err && <p className="mt-1 text-sm text-gray-500">{f.hint}</p>}
            {err && (
              <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-400">
                {err}
              </p>
            )}
          </div>
        )
      })}

      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'ok' ? 'text-base text-emerald-300' : 'text-base text-red-400'}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 min-h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-base font-semibold"
      >
        {busy && <Loader2 size={18} className="animate-spin" aria-hidden />}
        저장
      </button>
    </form>
  )
}
