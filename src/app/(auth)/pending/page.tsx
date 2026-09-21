import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/session'
import { PendingForm } from '@/features/auth/components/PendingForm'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'

export default async function PendingPage() {
  const t = await getTranslations('auth.pending')
  const { profile } = await getSessionProfile()
  if (!profile) redirect('/login')
  if (profile.status === 'active') redirect('/home')

  const rejected = profile.status === 'rejected'

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-xl mx-auto mb-4">
            AI
          </div>
          <h1 className="text-2xl font-bold text-white">{rejected ? t('titleRejected') : t('titlePending')}</h1>
          <p className="text-gray-400 text-base mt-2 break-all">{profile.email}</p>
        </div>

        {rejected ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-base text-gray-300 leading-relaxed">{t('rejectedBody')}</div>
        ) : (
          <>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-base text-gray-300 leading-relaxed">{t('pendingBody')}</div>
            <PendingForm
              initial={{
                name: profile.name,
                requestedCohort: profile.requested_cohort,
                company: profile.company ?? '',
              }}
            />
          </>
        )}

        <form action="/auth/signout" method="post" className="text-center">
          <button type="submit" className="min-h-11 px-4 text-sm text-gray-400 hover:text-white underline underline-offset-4">
            {t('signOutOther')}
          </button>
        </form>

        <div className="flex justify-center">
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  )
}
