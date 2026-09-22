import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, ShieldCheck } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/session'
import { Avatar } from '@/components/ui/Avatar'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { CohortBadge } from '@/components/ui/CohortBadge'
import { NotificationSettings } from '@/features/me/components/NotificationSettings'
import { InstallHint } from '@/features/me/components/InstallHint'
import { ProfileForm } from '@/features/me/components/ProfileForm'

export async function generateMetadata() {
  const t = await getTranslations('me')
  return { title: t('metaTitle') }
}

// Design Ref: §5.4 /me — 프로필 편집, 이메일 알림 설정, 읽기 전용 정보, 로그아웃
export default async function MePage() {
  const t = await getTranslations('me')
  const tc = await getTranslations('common')
  const { supabase, user, profile } = await getSessionProfile()
  if (!user || !profile) redirect('/login')

  let cohortNumber: number | null = null
  if (profile.cohort_id) {
    const { data } = await supabase.from('cohorts').select('number').eq('id', profile.cohort_id).maybeSingle()
    cohortNumber = data?.number ?? null
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <header className="flex items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.name} size="xl" />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white break-words">{profile.name}</h1>
            {cohortNumber !== null && <CohortBadge cohortNumber={cohortNumber} size="lg" />}
          </div>
          <p className="text-base text-gray-400 break-all" data-testid="me-email">
            {profile.email}
          </p>
        </div>
      </header>

      <section aria-labelledby="me-profile" className="space-y-4">
        <h2 id="me-profile" className="text-lg font-semibold text-white">{t('profile')}</h2>
        <p className="text-sm text-gray-500">{t('profileNote')}</p>
        <ProfileForm
          userId={user.id}
          initial={{
            name: profile.name,
            company: profile.company ?? '',
            position: profile.position ?? '',
            bio: profile.bio ?? '',
            github_url: profile.github_url ?? '',
            linkedin_url: profile.linkedin_url ?? '',
            website_url: profile.website_url ?? '',
          }}
        />
      </section>

      <section aria-labelledby="me-notify" className="space-y-4">
        <h2 id="me-notify" className="text-lg font-semibold text-white">{t('notifications')}</h2>
        <NotificationSettings
          userId={user.id}
          initial={{ notify_new_resource: profile.notify_new_resource, notify_announcement: profile.notify_announcement }}
        />
      </section>

      <section aria-labelledby="me-language" className="space-y-3">
        <h2 id="me-language" className="text-lg font-semibold text-white">{t('language')}</h2>
        <LocaleSwitcher />
      </section>

      <InstallHint />

      <section aria-labelledby="me-account" className="space-y-3">
        <h2 id="me-account" className="text-lg font-semibold text-white">{t('account')}</h2>
        <dl className="rounded-2xl border border-white/10 bg-white/5 p-4 text-base space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">{t('email')}</dt>
            <dd className="text-gray-200 break-all text-right">{profile.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">{t('cohort')}</dt>
            <dd className="text-gray-200">{cohortNumber !== null ? tc('cohort', { number: cohortNumber }) : '-'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">{t('status')}</dt>
            <dd className="text-gray-200">{profile.role === 'admin' ? t('statusActiveAdmin') : t('statusActive')}</dd>
          </div>
        </dl>
        <p className="text-sm text-gray-500">{t('contactAdmin')}</p>

        {profile.role === 'admin' && (
          <Link
            href="/admin"
            className="flex items-center gap-3 min-h-14 bg-green-600/15 border border-green-500/30 rounded-2xl px-5 text-base font-medium text-green-200 hover:bg-green-600/25 transition-colors"
          >
            <ShieldCheck size={20} aria-hidden /> {t('adminArea')}
          </Link>
        )}

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 min-h-12 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-base font-medium text-gray-100"
          >
            <LogOut size={18} aria-hidden /> {t('signOut')}
          </button>
        </form>
      </section>
    </div>
  )
}
