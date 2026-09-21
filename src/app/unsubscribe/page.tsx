// Design Ref: §4.2 /api/unsubscribe — 메일의 "수신 해제" 링크가 여는 화면. 로그인이 필요 없다(서명 토큰이 권한).
// 링크를 여는 것만으로 해제하지 않는다: 메일 보안 프로그램이 링크를 미리 열어 보는 경우가 있어, 버튼을 눌러야 해제된다.
import Link from 'next/link'
import { CheckCircle2, MailX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { UNSUBSCRIBE_SCOPES, verifyUnsubscribeToken, type UnsubscribeScope } from '@/features/notifications/unsubscribe'

export async function generateMetadata() {
  const t = await getTranslations('unsubscribe')
  return { title: t('metaTitle') }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-xl mx-auto">AI</div>
        {children}
      </div>
    </div>
  )
}

export default async function UnsubscribePage({ searchParams }: { searchParams: { t?: string; done?: string; s?: string } }) {
  const t = await getTranslations('unsubscribe')
  const b = (chunks: React.ReactNode) => <b className="text-gray-200">{chunks}</b>
  // 해제 완료 화면 (토큰을 주소에 남기지 않는다)
  if (searchParams.done === '1') {
    const scope = (UNSUBSCRIBE_SCOPES as readonly string[]).includes(searchParams.s ?? '') ? (searchParams.s as UnsubscribeScope) : 'all'
    return (
      <Shell>
        <CheckCircle2 className="mx-auto text-emerald-400" size={40} aria-hidden />
        <h1 className="text-2xl font-bold text-white">{t('doneTitle')}</h1>
        <p className="text-base leading-relaxed text-gray-400">
          {t.rich('doneBody', { scope: t(`scopes.${scope}`), b })}
        </p>
        <Link href="/me" className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-semibold">
          {t('openSettings')}
        </Link>
      </Shell>
    )
  }

  const payload = verifyUnsubscribeToken(process.env.UNSUBSCRIBE_HMAC_SECRET ?? '', searchParams.t)
  if (!payload) {
    return (
      <Shell>
        <MailX className="mx-auto text-gray-500" size={40} aria-hidden />
        <h1 className="text-2xl font-bold text-white">{t('invalidTitle')}</h1>
        <p className="text-base leading-relaxed text-gray-400">
          {t.rich('invalidBody', { b })}
        </p>
        <Link href="/me" className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-semibold">
          {t('toProfile')}
        </Link>
      </Shell>
    )
  }

  return (
    <Shell>
      <MailX className="mx-auto text-indigo-300" size={40} aria-hidden />
      <h1 className="text-2xl font-bold text-white">{t('confirmTitle')}</h1>
      <p className="text-base leading-relaxed text-gray-400">
        {t.rich('confirmBody', { scope: t(`scopes.${payload.s}`), b })}
      </p>
      <form action="/api/unsubscribe" method="post" className="space-y-3">
        <input type="hidden" name="t" value={searchParams.t} />
        <button type="submit" className="w-full min-h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-semibold" data-testid="unsubscribe-confirm">
          {t('confirm')}
        </button>
        <Link href="/home" className="flex items-center justify-center min-h-12 text-base text-gray-400 hover:text-white">
          {t('cancel')}
        </Link>
      </form>
    </Shell>
  )
}
