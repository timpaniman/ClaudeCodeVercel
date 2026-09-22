import { getTranslations } from 'next-intl/server'
import { OtpForm } from '@/features/auth/components/OtpForm'
import { loginQueryError } from '@/features/auth/authErrors'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { safeNext } from '@/lib/auth/safeNext'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string }
}) {
  const t = await getTranslations()
  const next = safeNext(searchParams.next)
  const queryError = loginQueryError(searchParams.error)

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center font-black text-white text-xl mx-auto mb-4">
            AI
          </div>
          <h1 className="text-2xl font-bold text-white">Kevin Community</h1>
          <p className="text-gray-400 text-base mt-1">{t('brand.portal')}</p>
        </div>

        {queryError && (
          <div role="alert" className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
            {t(`auth.linkErrors.${queryError}`)}
          </div>
        )}

        <OtpForm next={next} />

        <p className="text-center text-sm text-gray-500 mt-8">{t('auth.login.passwordless')}</p>

        <div className="flex justify-center mt-4">
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  )
}
