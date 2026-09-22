'use client'

// Design Ref: §5.4 /me — 프로필 편집. profiles 의 지정 컬럼만 수정한다(role/status/cohort/email 은 DB 컬럼 권한이 막는다).
// 사진 업로드는 v1.1 (아바타 저장소·정책이 별도로 필요). 지금은 이름의 첫 글자 아바타를 쓴다.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PROFILE_LIMITS, validateProfile, type ProfileError, type ProfileField, type ProfileInput } from '../profile'

const inputClass =
  'w-full min-h-12 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500'

interface FieldSpec {
  name: ProfileField
  placeholder?: string
  autoComplete?: string
  multiline?: boolean
  inputMode?: 'url'
  /** true 면 me.bioHint 문구를 보여 준다 */
  hint?: boolean
}

const FIELDS: FieldSpec[] = [
  { name: 'name', autoComplete: 'name' },
  { name: 'company', autoComplete: 'organization' },
  { name: 'position', autoComplete: 'organization-title' },
  { name: 'bio', multiline: true, hint: true },
  { name: 'github_url', placeholder: 'https://github.com/…', inputMode: 'url' },
  { name: 'linkedin_url', placeholder: 'https://www.linkedin.com/in/…', inputMode: 'url' },
  { name: 'website_url', placeholder: 'https://…', inputMode: 'url' },
]

export function ProfileForm({ userId, initial }: { userId: string; initial: ProfileInput }) {
  const t = useTranslations('me')
  const router = useRouter()
  const [values, setValues] = useState<ProfileInput>(initial)
  const [errors, setErrors] = useState<Partial<Record<ProfileField, ProfileError>>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  // 오류 문구는 저장하지 않고(언어를 바꾸면 따라 바뀌도록) 종류만 보관한 뒤 그릴 때 번역한다
  const errorText = (e: ProfileError) => {
    const label = 'field' in e ? t(`fields.${e.field}`) : ''
    return t(`profileErrors.${e.key}`, { max: 'max' in e ? e.max : 0, label, host: 'host' in e ? e.host : '' })
  }

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
      return setMessage({ kind: 'error', text: t('form.fixInput') })
    }
    setErrors({})

    setBusy(true)
    const { error } = await createClient().from('profiles').update(v.value).eq('id', userId)
    setBusy(false)
    if (error) {
      // 23514 = DB 검사 제약 위반 (화면 검증을 우회했거나 규칙이 바뀐 경우)
      const text = error.code === '23514' ? t('form.errFormat') : t('form.errSave')
      return setMessage({ kind: 'error', text })
    }

    setMessage({ kind: 'ok', text: t('form.saved') })
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
          placeholder: f.name === 'position' ? t('positionPlaceholder') : f.placeholder,
        }
        return (
          <div key={f.name}>
            <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
              {t(`fields.${f.name}`)}
            </label>
            {f.multiline ? (
              <textarea {...common} rows={4} maxLength={PROFILE_LIMITS.bio} onChange={(e) => set(f.name, e.target.value)} className={`${inputClass} resize-y`} />
            ) : (
              <input {...common} autoComplete={f.autoComplete} inputMode={f.inputMode} onChange={(e) => set(f.name, e.target.value)} />
            )}
            {f.hint && !err && <p className="mt-1 text-sm text-gray-500">{t('bioHint')}</p>}
            {err && (
              <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-400">
                {errorText(err)}
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
        className="inline-flex items-center justify-center gap-2 min-h-12 px-8 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-base font-semibold"
      >
        {busy && <Loader2 size={18} className="animate-spin" aria-hidden />}
        {t('form.save')}
      </button>
    </form>
  )
}
