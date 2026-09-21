import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  barPercents,
  donutSlices,
  linePoints,
  mobilePercent,
  type AdminStats,
  type CohortUsers,
  type TopResource,
  type WeekUsers,
} from '@/features/admin/stats'

// Design Ref: §5.4 /admin — KPI, 기수별 활성(Bar), 주간 접속(Line), 모바일 vs PC(Donut), 인기 자료 Top 10.
// 차트 라이브러리 없이 HTML/SVG 로 그린다(서버 컴포넌트, 번들 증가 없음). 모든 차트는 숫자를 글자로도 보여 준다.

export function KpiCard({ label, value, sub, href, highlight }: { label: string; value: string | number; sub?: string; href?: string; highlight?: boolean }) {
  const cls = cn(
    'block rounded-2xl border p-4 sm:p-5 transition-colors',
    href && 'hover:bg-white/10',
    highlight ? 'border-indigo-500/40 bg-indigo-600/10' : 'border-white/10 bg-white/5',
  )
  const body = (
    <>
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1">{value}</div>
      {sub && <div className="text-sm text-gray-400 mt-1">{sub}</div>}
    </>
  )
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function Panel({ title, note, children, testId }: { title: string; note?: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3" data-testid={testId}>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {note && <p className="text-sm text-gray-500 mt-0.5">{note}</p>}
      </div>
      {children}
    </section>
  )
}

function Empty() {
  const t = useTranslations('admin.stats')
  return <p className="text-base text-gray-500 py-4">{t('empty')}</p>
}

export function CohortBars({ rows }: { rows: CohortUsers[] }) {
  const t = useTranslations('admin.stats.cohorts')
  const tc = useTranslations('common')
  const widths = barPercents(rows.map((r) => r.users))
  return (
    <Panel title={t('title')} note={t('note')} testId="chart-cohorts">
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.cohortNumber} className="flex items-center gap-3 text-base">
              <span className="w-16 shrink-0 text-gray-300">{tc('cohort', { number: r.cohortNumber })}</span>
              <span className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden" aria-hidden>
                <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(widths[i], r.users > 0 ? 3 : 0)}%` }} />
              </span>
              <span className="w-24 shrink-0 text-right font-semibold text-white">{t('users', { count: r.users })}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

const W = 320
const H = 120
const shortDate = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`

export function WeeklyLine({ rows }: { rows: WeekUsers[] }) {
  const t = useTranslations('admin.stats.weekly')
  const values = rows.map((r) => r.users)
  const pts = linePoints(values, W, H)
  const total = values.reduce((a, b) => a + b, 0)
  const max = Math.max(...values, 0)
  const last = rows[rows.length - 1]
  return (
    <Panel title={t('title')} note={t('note')} testId="chart-weekly">
      {total === 0 ? (
        <Empty />
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label={t('aria', { last: last?.users ?? 0, max })}
          >
            <line x1="8" y1={H - 8} x2={W - 8} y2={H - 8} className="stroke-white/15" strokeWidth="1" />
            <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" className="stroke-indigo-400" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={rows[i].week} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} className="fill-indigo-300" />
            ))}
          </svg>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{shortDate(rows[0].week)}</span>
            <span>
              {t.rich('summary', { last: last?.users ?? 0, max, b: (chunks) => <b className="text-gray-200">{chunks}</b> })}
            </span>
            <span>{shortDate(last.week)}</span>
          </div>
        </>
      )}
    </Panel>
  )
}

export function DeviceDonut({ device }: { device: AdminStats['device'] }) {
  const t = useTranslations('admin.stats.device')
  const slices = donutSlices([
    { key: 'mobile', value: device.mobile },
    { key: 'desktop', value: device.desktop },
    { key: 'other', value: device.other },
  ])
  const mobile = mobilePercent(device)
  const COLOR: Record<string, string> = { mobile: 'stroke-indigo-400', desktop: 'stroke-sky-400', other: 'stroke-gray-500' }
  const LABEL: Record<string, string> = { mobile: t('mobile'), desktop: t('desktop'), other: t('other') }
  return (
    <Panel title={t('title')} note={t('note')} testId="chart-device">
      {slices.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex items-center gap-6">
          <svg viewBox="0 0 40 40" className="w-32 h-32 shrink-0" role="img" aria-label={t('aria', { percent: mobile ?? 0 })}>
            <circle cx="20" cy="20" r="16" fill="none" className="stroke-white/10" strokeWidth="6" />
            {slices.map((s) => (
              <circle
                key={s.key}
                cx="20"
                cy="20"
                r="16"
                fill="none"
                pathLength={100}
                className={COLOR[s.key]}
                strokeWidth="6"
                strokeDasharray={`${s.dash} ${100 - s.dash}`}
                strokeDashoffset={s.offset}
                transform="rotate(-90 20 20)"
              />
            ))}
            <text x="20" y="21" textAnchor="middle" dominantBaseline="middle" className="fill-white" fontSize="8" fontWeight="700">
              {mobile}%
            </text>
          </svg>
          <ul className="space-y-1.5 text-base">
            {slices.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-gray-300">
                <span className={cn('inline-block size-3 rounded-full', s.key === 'mobile' ? 'bg-indigo-400' : s.key === 'desktop' ? 'bg-sky-400' : 'bg-gray-500')} aria-hidden />
                {LABEL[s.key]} <b className="text-white">{s.percent}%</b>
                <span className="text-gray-500">{t('times', { count: s.value })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

export function TopResources({ rows }: { rows: TopResource[] }) {
  const t = useTranslations('admin.stats.top')
  return (
    <Panel title={t('title')} note={t('note')} testId="chart-top-resources">
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <ol className="divide-y divide-white/10">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5 text-base">
              <span className="w-6 shrink-0 text-gray-500">{i + 1}</span>
              <Link href={`/library/${r.id}`} className="flex-1 min-w-0 text-gray-100 hover:text-white truncate">
                {r.title}
              </Link>
              <span className="shrink-0 text-sm text-gray-400">
                {t.rich('counts', { downloads: r.downloads, views: r.views, b: (chunks) => <b className="text-white">{chunks}</b> })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
