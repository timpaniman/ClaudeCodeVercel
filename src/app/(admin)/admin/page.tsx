import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { cn, formatRelativeTime } from '@/lib/utils'
import { loadNotificationConfig } from '@/features/notifications/config'
import { CohortBars, DeviceDonut, KpiCard, TopResources, WeeklyLine } from '@/features/admin/components/StatsCharts'
import { fillWeeks, formatRate, parseAdminStats } from '@/features/admin/stats'

// Design Ref: §5.4 /admin — KPI 4 + 차트(기수별·주간·모바일 비율) + 인기 자료 Top 10 (admin_stats RPC), 이메일 알림 상태·최근 발송 (module-5).
export default async function AdminDashboardPage() {
  const t = await getTranslations('admin.dashboard')
  const tt = await getTranslations('admin.titles')
  const locale = await getLocale()
  const { supabase, profile } = await getSessionProfile()
  // 이 페이지는 RLS 를 우회하는 service role 클라이언트도 쓰므로, 레이아웃·미들웨어에만 기대지 않고 여기서도 운영진인지 확인한다.
  if (profile?.role !== 'admin' || profile.status !== 'active') redirect('/home')

  const { data: raw, error: statsError } = await supabase.rpc('admin_stats')
  const stats = parseAdminStats(raw)
  const weeks = fillWeeks(stats.weeklyVisits, new Date())

  const cards = [
    { label: t('kpi.activeMembers'), value: stats.membersActive, href: '/admin/roster' },
    { label: t('kpi.signupRate'), value: formatRate(stats.signupRate), sub: t('kpi.signupSub', { total: stats.rosterTotal, claimed: stats.rosterClaimed }), href: '/admin/roster' },
    { label: t('kpi.mau'), value: stats.mau, sub: t('kpi.mauSub') },
    { label: t('kpi.pending'), value: stats.membersPending, href: '/admin/approvals', highlight: stats.membersPending > 0 },
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">{tt('dashboard')}</h1>
      {statsError && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-base text-amber-100" role="alert">
          {t('statsError')}
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
        <h2 id="admin-mail" className="text-lg font-semibold text-white">{t('mail.title')}</h2>
        <div
          className={cn('rounded-2xl border p-4 text-base', config ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100')}
          data-testid="mail-status"
        >
          {config
            ? config.provider.name === 'log'
              ? t('mail.dev')
              : t('mail.on')
            : t('mail.off')}
        </div>

        {(jobs ?? []).length > 0 && (
          <ul className="space-y-2" data-testid="mail-jobs">
            {(jobs ?? []).map((j) => {
              const c = sentCounts.get(j.id) ?? { sent: 0, failed: 0 }
              return (
                <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                  <span className="font-medium text-white">{j.kind === 'resource' ? t('mail.jobResource') : t('mail.jobAnnouncement')}</span>
                  <span>{t(`mail.status.${j.status}`)}</span>
                  <span>{t('mail.sent', { count: c.sent })}</span>
                  {c.failed > 0 && <span className="text-amber-300">{t('mail.failed', { count: c.failed })}</span>}
                  <span className="text-gray-500">{formatRelativeTime(j.created_at, locale)}</span>
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
