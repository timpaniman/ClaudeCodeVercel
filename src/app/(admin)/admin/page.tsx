import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { cn, formatRelativeTime } from '@/lib/utils'
import { loadNotificationConfig } from '@/features/notifications/config'
import { CohortBars, DeviceDonut, KpiCard, TopResources, WeeklyLine } from '@/features/admin/components/StatsCharts'
import { fillWeeks, formatRate, parseAdminStats } from '@/features/admin/stats'

// Design Ref: §5.4 /admin — KPI 4 + 차트(기수별·주간·모바일 비율) + 인기 자료 Top 10 (admin_stats RPC), 이메일 알림 상태·최근 발송 (module-5).
export default async function AdminDashboardPage() {
  const { supabase, profile } = await getSessionProfile()
  // 이 페이지는 RLS 를 우회하는 service role 클라이언트도 쓰므로, 레이아웃·미들웨어에만 기대지 않고 여기서도 운영진인지 확인한다.
  if (profile?.role !== 'admin' || profile.status !== 'active') redirect('/home')

  const { data: raw, error: statsError } = await supabase.rpc('admin_stats')
  const stats = parseAdminStats(raw)
  const weeks = fillWeeks(stats.weeklyVisits, new Date())

  const cards = [
    { label: '활성 회원', value: stats.membersActive, href: '/admin/roster' },
    { label: '가입 완료율', value: formatRate(stats.signupRate), sub: `명단 ${stats.rosterTotal}명 중 ${stats.rosterClaimed}명`, href: '/admin/roster' },
    { label: '최근 30일 접속자', value: stats.mau, sub: '접속 기록이 있는 회원 수(MAU)' },
    { label: '승인 대기', value: stats.membersPending, href: '/admin/approvals', highlight: stats.membersPending > 0 },
  ]

  // 이메일 알림 상태와 최근 작업 (notification_* 테이블은 service role 로만 읽는다. 이 페이지는 운영진만 접근한다)
  const config = loadNotificationConfig()
  const svc = createAdminClient()
  const { data: jobs } = await svc
    .from('notification_jobs')
    .select('id, kind, status, attempts, error, created_at')
    .order('created_at', { ascending: false })
    .limit(8)
  // 작업별 성공·실패 인원: 행을 모두 가져오지 않고 DB 가 세게 한다 (건수만 요청)
  const counts = await Promise.all(
    (jobs ?? []).map(async (j) => {
      const count = (status: 'sent' | 'failed') =>
        svc.from('notification_deliveries').select('job_id', { count: 'exact', head: true }).eq('job_id', j.id).eq('status', status)
      const [sent, failed] = await Promise.all([count('sent'), count('failed')])
      return [j.id, { sent: sent.count ?? 0, failed: failed.count ?? 0 }] as const
    }),
  )
  const sentCounts = new Map(counts)
  const STATUS_LABEL = { queued: '대기', processing: '처리 중', done: '완료', failed: '실패(재시도 예정)' } as const

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">관리자</h1>
      {statsError && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-base text-amber-100" role="alert">
          통계를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" data-testid="kpi-cards">
        {cards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyLine rows={weeks} />
        <DeviceDonut device={stats.device} />
        <CohortBars rows={stats.mauByCohort} />
        <TopResources rows={stats.topResources} />
      </div>

      <section aria-labelledby="admin-mail" className="space-y-3">
        <h2 id="admin-mail" className="text-lg font-semibold text-white">이메일 알림</h2>
        <div
          className={cn('rounded-2xl border p-4 text-base', config ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100')}
          data-testid="mail-status"
        >
          {config
            ? config.provider.name === 'log'
              ? '개발 모드: 메일을 실제로 보내지 않고 서버 로그에만 남깁니다.'
              : '이메일 서비스가 연결되어 있습니다. 자료·공지를 올릴 때 알림을 보낼 수 있습니다.'
            : '이메일 서비스가 아직 설정되지 않았습니다. 설정 전에는 알림 체크박스가 비활성이며, 자료·공지는 알림 없이 공개됩니다.'}
        </div>

        {(jobs ?? []).length > 0 && (
          <ul className="space-y-2" data-testid="mail-jobs">
            {(jobs ?? []).map((j) => {
              const c = sentCounts.get(j.id) ?? { sent: 0, failed: 0 }
              return (
                <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                  <span className="font-medium text-white">{j.kind === 'resource' ? '새 자료' : '공지'}</span>
                  <span>{STATUS_LABEL[j.status]}</span>
                  <span>성공 {c.sent}명</span>
                  {c.failed > 0 && <span className="text-amber-300">실패 {c.failed}명</span>}
                  <span className="text-gray-500">{formatRelativeTime(j.created_at)}</span>
                  {j.error && <span className="w-full text-xs text-gray-500 break-words">{j.error}</span>}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
