'use client'

// Design Ref: §5.4 /me — 이메일 알림 수신 설정. 스위치를 누르면 바로 저장하고, 실패하면 되돌린다.
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Key = 'notify_new_resource' | 'notify_announcement'

// text 는 me.notify.<text>.title / desc 문구의 이름이다
const ITEMS: { key: Key; text: 'newResource' | 'announcement' }[] = [
  { key: 'notify_new_resource', text: 'newResource' },
  { key: 'notify_announcement', text: 'announcement' },
]

export function NotificationSettings({ userId, initial }: { userId: string; initial: Record<Key, boolean> }) {
  const t = useTranslations('me.notify')
  const [values, setValues] = useState(initial)
  const [busy, setBusy] = useState<Key | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggle = async (key: Key) => {
    if (busy) return
    setError(null)
    const next = !values[key]
    setValues((v) => ({ ...v, [key]: next })) // 먼저 반영하고
    setBusy(key)
    const patch = key === 'notify_new_resource' ? { notify_new_resource: next } : { notify_announcement: next }
    const { error: e } = await createClient().from('profiles').update(patch).eq('id', userId)
    setBusy(null)
    if (e) {
      setValues((v) => ({ ...v, [key]: !next })) // 실패하면 되돌린다
      setError(t('errSave'))
    }
  }

  return (
    <div className="space-y-3" data-testid="notification-settings">
      {ITEMS.map(({ key, text }) => (
        <div key={key} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="min-w-0 flex-1">
            <div id={`${key}-label`} className="text-base font-semibold text-white">{t(`${text}.title`)}</div>
            <p className="text-sm text-gray-400">{t(`${text}.desc`)}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={values[key]}
            aria-labelledby={`${key}-label`}
            disabled={busy !== null}
            onClick={() => toggle(key)}
            className={cn(
              'relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
              values[key] ? 'bg-indigo-600' : 'bg-white/20',
            )}
          >
            <span className={cn('absolute top-1 h-6 w-6 rounded-full bg-white transition-all', values[key] ? 'left-7' : 'left-1')} />
            <span className="sr-only">{values[key] ? t('on') : t('off')}</span>
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {!values.notify_new_resource && !values.notify_announcement && (
        <p className="text-sm text-gray-500">{t('allOff')}</p>
      )}
    </div>
  )
}
