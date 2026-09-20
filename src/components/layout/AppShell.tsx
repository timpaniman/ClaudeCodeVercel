// Design Ref: §5.3 — 로그인한 활성 회원 전용 화면의 공통 틀 (사이드바 + 모바일 하단 탭).
// 접근 규칙의 기준은 middleware + RLS 이고, 여기서는 서버 컴포넌트가 잘못 렌더링되지 않도록 한 번 더 확인한다.
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth/session'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { VisitLogger } from '@/components/layout/VisitLogger'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await getSessionProfile()

  if (!user) redirect('/login')
  if (!profile) redirect('/login?error=no_profile')
  if (profile.status !== 'active') redirect('/pending')

  let cohortNumber: number | undefined
  if (profile.cohort_id) {
    const { data: cohort } = await supabase.from('cohorts').select('number').eq('id', profile.cohort_id).maybeSingle()
    cohortNumber = cohort?.number
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar
        userId={user.id}
        user={{
          name: profile.name,
          company: profile.company ?? undefined,
          avatarUrl: profile.avatar_url ?? undefined,
          cohortNumber,
          isAdmin: profile.role === 'admin',
        }}
      />
      <div className="lg:pl-60">
        <main className="pb-24 lg:pb-0">{children}</main>
      </div>
      <MobileNav userId={user.id} />
      <VisitLogger userId={user.id} />
    </div>
  )
}
