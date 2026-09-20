'use client'

import { useEffect, useState } from 'react'
import { Share, SquarePlus, Smartphone } from 'lucide-react'
import { decideInstallMode, type InstallMode } from '@/lib/pwa'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

// 홈 화면에 추가하면 앱처럼 바로 열린다. 이미 설치했거나 설치할 수 없는 브라우저에서는 아무것도 그리지 않는다.
export function InstallHint() {
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
      <h2 id="me-install" className="text-lg font-semibold text-white">홈 화면에 추가</h2>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 text-base text-gray-300">
        {mode === 'prompt' ? (
          <>
            <p className="flex items-start gap-2"><Smartphone size={20} className="mt-0.5 shrink-0 text-indigo-300" aria-hidden /> 홈 화면에 추가하면 앱처럼 바로 열 수 있습니다.</p>
            <button
              type="button"
              onClick={async () => {
                if (!promptEvent) return
                await promptEvent.prompt()
                await promptEvent.userChoice.catch(() => null)
                setPromptEvent(null)
                setMode('none')
              }}
              className="min-h-12 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-base font-semibold text-white"
            >
              홈 화면에 추가
            </button>
          </>
        ) : mode === 'ios-other-browser' ? (
          <p className="flex items-start gap-2">
            <Share size={20} className="mt-0.5 shrink-0 text-indigo-300" aria-hidden />
            <span>iPhone에서는 <b className="text-white">Safari</b>로 열어야 홈 화면에 추가할 수 있습니다. 카카오톡 등 앱 안에서 연 화면이라면 주소를 복사해 Safari에서 열어 주세요.</span>
          </p>
        ) : (
          <ol className="space-y-2">
            <li className="flex items-start gap-2"><Share size={20} className="mt-0.5 shrink-0 text-indigo-300" aria-hidden /> Safari 아래의 <b className="text-white">공유</b> 버튼을 누릅니다.</li>
            <li className="flex items-start gap-2"><SquarePlus size={20} className="mt-0.5 shrink-0 text-indigo-300" aria-hidden /> <b className="text-white">홈 화면에 추가</b>를 선택합니다.</li>
          </ol>
        )}
      </div>
    </section>
  )
}
