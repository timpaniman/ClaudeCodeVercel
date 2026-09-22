'use client'

import { useEffect, useState } from 'react'
import { Share, SquarePlus, Smartphone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { decideInstallMode, type InstallMode } from '@/lib/pwa'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

// 홈 화면에 추가하면 앱처럼 바로 열린다. 이미 설치했거나 설치할 수 없는 브라우저에서는 아무것도 그리지 않는다.
export function InstallHint() {
  const t = useTranslations('me.install')
  const b = (chunks: React.ReactNode) => <b className="text-white">{chunks}</b>
  const [mode, setMode] = useState<InstallMode>('none')
  const [promptEvent, setPromptEvent] = useState<PromptEvent | null>(null)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    const evaluate = (hasInstallPrompt: boolean) => setMode(decideInstallMode({ userAgent: navigator.userAgent, standalone, hasInstallPrompt }))
    evaluate(false)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as PromptEvent)
      evaluate(true)
    }
    const onInstalled = () => {
      setPromptEvent(null)
      setMode('installed')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (mode === 'installed' || mode === 'none') return null

  return (
    <section aria-labelledby="me-install" className="space-y-3" data-testid="install-hint">
      <h2 id="me-install" className="text-lg font-semibold text-white">{t('title')}</h2>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 text-base text-gray-300">
        {mode === 'prompt' ? (
          <>
            <p className="flex items-start gap-2"><Smartphone size={20} className="mt-0.5 shrink-0 text-green-300" aria-hidden /> {t('prompt')}</p>
            <button
              type="button"
              onClick={async () => {
                if (!promptEvent) return
                await promptEvent.prompt()
                await promptEvent.userChoice.catch(() => null)
                setPromptEvent(null)
                setMode('none')
              }}
              className="min-h-12 w-full rounded-xl bg-green-600 hover:bg-green-500 text-base font-semibold text-white"
            >
              {t('button')}
            </button>
          </>
        ) : mode === 'ios-other-browser' ? (
          <p className="flex items-start gap-2">
            <Share size={20} className="mt-0.5 shrink-0 text-green-300" aria-hidden />
            <span>{t.rich('iosOther', { b })}</span>
          </p>
        ) : (
          <ol className="space-y-2">
            <li className="flex items-start gap-2"><Share size={20} className="mt-0.5 shrink-0 text-green-300" aria-hidden /> {t.rich('step1', { b })}</li>
            <li className="flex items-start gap-2"><SquarePlus size={20} className="mt-0.5 shrink-0 text-green-300" aria-hidden /> {t.rich('step2', { b })}</li>
          </ol>
        )}
      </div>
    </section>
  )
}
