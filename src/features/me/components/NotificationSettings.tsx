'use client'

// Design Ref: §5.4 /me — 이메일 알림 수신 설정. 스위치를 누르면 바로 저장하고, 실패하면 되돌린다.
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Key = 'notify_new_resource' | 'notify_announcement'

const ITEMS: { key: Key; title: string; desc: string }[] = [
  { key: 'notify_new_resource', title: '새 자료 알림', desc: '내가 볼 수 있는 새 자료가 올라오면 이메일로 알려 드립니다.' },
  { key: 'notify_announcement', title: '공지 알림', desc: '운영진이 공지를 올리면 이메일로 알려 드립니다.' },
]

export function NotificationSettings({ userId, initial }: { userId: string; initial: Record<Key, boolean> }) {
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
      setError('설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <div className="space-y-3" data-testid="notification-settings">
      {ITEMS.map(({ key, title, desc }) => (
        <div key={key} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="min-w-0 flex-1">
            <div id={`${key}-label`} className="text-base font-semibold text-white">{title}</div>
            <p className="text-sm text-gray-400">{desc}</p>
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
            <span className="sr-only">{values[key] ? '켜짐' : '꺼짐'}</span>
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {!values.notify_new_resource && !values.notify_announcement && (
        <p className="text-sm text-gray-500">지금은 알림 메일을 받지 않습니다. 새 자료와 공지는 포털에서 직접 확인해 주세요.</p>
      )}
    </div>
  )
}
