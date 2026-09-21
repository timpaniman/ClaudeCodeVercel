'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { localeCookieString, locales, type Locale } from '@/i18n/config'

// 언어 전환. 선택은 쿠키(NEXT_LOCALE)에 저장되고, 서버가 다시 그리도록 새로고침한다.
// 언어 이름은 번역하지 않고 그 언어로 표기한다(어느 언어를 보고 있어도 자기 언어를 찾을 수 있도록).
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('locale')
  const current = useLocale()
  const router = useRouter()

  const change = async (locale: Locale) => {
    if (locale === current) return
    document.cookie = localeCookieString(locale)
    // 로그인한 회원이면 알림 메일도 이 언어로 받도록 프로필에 함께 저장한다 (실패해도 화면 언어 전환에는 영향이 없다)
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data.user) await supabase.from('profiles').update({ locale }).eq('id', data.user.id)
    } catch {
      /* 무시 */
    }
    router.refresh()
  }

  return (
    <div role="group" aria-label={t('label')} className={cn('inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5', className)}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => change(locale)}
          lang={locale}
          aria-pressed={current === locale}
          className={cn(
            'min-h-9 px-3 rounded-md text-sm font-medium transition-colors',
            current === locale ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white',
          )}
        >
          {t(locale)}
        </button>
      ))}
    </div>
  )
}
