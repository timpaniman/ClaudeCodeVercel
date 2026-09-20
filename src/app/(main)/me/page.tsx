import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, ShieldCheck } from 'lucide-react'
import { getSessionProfile } from '@/lib/auth/session'
import { Avatar } from '@/components/ui/Avatar'
import { CohortBadge } from '@/components/ui/CohortBadge'
import { NotificationSettings } from '@/features/me/components/NotificationSettings'
import { InstallHint } from '@/features/me/components/InstallHint'
import { ProfileForm } from '@/features/me/components/ProfileForm'

export const metadata = { title: '내 프로필 — AI4CEO' }

// Design Ref: §5.4 /me — 프로필 편집, 이메일 알림 설정, 읽기 전용 정보, 로그아웃
export default async function MePage() {
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
        <h2 id="me-profile" className="text-lg font-semibold text-white">프로필</h2>
        <p className="text-sm text-gray-500">다른 졸업생이 멤버 화면에서 볼 수 있는 정보입니다. 이메일은 공개되지 않습니다.</p>
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
        <h2 id="me-notify" className="text-lg font-semibold text-white">이메일 알림</h2>
        <NotificationSettings
          userId={user.id}
          initial={{ notify_new_resource: profile.notify_new_resource, notify_announcement: profile.notify_announcement }}
        />
      </section>

      <InstallHint />

      <section aria-labelledby="me-account" className="space-y-3">
        <h2 id="me-account" className="text-lg font-semibold text-white">계정</h2>
        <dl className="rounded-2xl border border-white/10 bg-white/5 p-4 text-base space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">이메일</dt>
            <dd className="text-gray-200 break-all text-right">{profile.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-400">기수</dt>
            <dd className="text-gray-200">{cohortNumber !== null ? `${cohortNumber}기` : '-'}</dd>
          </div>
        </dl>
        <p className="text-sm text-gray-500">이메일이나 기수를 바꾸려면 운영진에게 문의해 주세요.</p>

        {profile.role === 'admin' && (
          <Link
            href="/admin"
            className="flex items-center gap-3 min-h-14 bg-indigo-600/15 border border-indigo-500/30 rounded-2xl px-5 text-base font-medium text-indigo-200 hover:bg-indigo-600/25 transition-colors"
          >
            <ShieldCheck size={20} aria-hidden /> 관리자 화면
          </Link>
        )}

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 min-h-12 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-base font-medium text-gray-100"
          >
            <LogOut size={18} aria-hidden /> 로그아웃
          </button>
        </form>
      </section>
    </div>
  )
}
