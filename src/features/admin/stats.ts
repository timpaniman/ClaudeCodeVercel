// Design Ref: §3.4 admin_stats() / §5.4 /admin (대시보드)
// admin_stats RPC 가 돌려주는 jsonb 를 화면용 값으로 바꾸는 순수 함수 모음. 값이 비어 있거나 모양이 달라도 화면이 깨지지 않게 방어적으로 읽는다.

export interface CohortUsers {
  cohortNumber: number
  users: number
}
export interface WeekUsers {
  /** 그 주 월요일 (YYYY-MM-DD, UTC) */
  week: string
  users: number
}
export interface TopResource {
  id: string
  title: string
  views: number
  downloads: number
}
export interface AdminStats {
  membersActive: number
  membersPending: number
  rosterTotal: number
  rosterClaimed: number
  /** 0~1. 명단이 비어 있으면 null */
  signupRate: number | null
  /** 최근 30일 접속자 수 (activity_log 에 기록이 있는 고유 회원) */
  mau: number
  mauByCohort: CohortUsers[]
  weeklyVisits: WeekUsers[]
  device: { mobile: number; desktop: number; other: number }
  topResources: TopResource[]
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
/** 유한한 0 이상의 정수. 아니면 0 (Postgres numeric 이 문자열로 올 수 있어 숫자 문자열도 받는다) */
const count = (v: unknown): number => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export function parseAdminStats(raw: unknown): AdminStats {
  const o = isObj(raw) ? raw : {}
  const rate = typeof o.signup_rate === 'string' ? Number(o.signup_rate) : o.signup_rate
  const device = isObj(o.device_ratio) ? o.device_ratio : {}

  return {
    membersActive: count(o.members_active),
    membersPending: count(o.members_pending),
    rosterTotal: count(o.roster_total),
    rosterClaimed: count(o.roster_claimed),
    signupRate: typeof rate === 'number' && Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : null,
    mau: count(o.mau),
    mauByCohort: arr(o.mau_by_cohort)
      .filter(isObj)
      .map((r) => ({ cohortNumber: count(r.cohort_number), users: count(r.users) }))
      .filter((r) => r.cohortNumber > 0)
      .sort((a, b) => a.cohortNumber - b.cohortNumber),
    weeklyVisits: arr(o.weekly_visits)
      .filter(isObj)
      .filter((r) => typeof r.week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.week))
      .map((r) => ({ week: r.week as string, users: count(r.users) })),
    device: {
      mobile: count(device.mobile),
      desktop: count(device.desktop),
      other: Object.entries(device)
        .filter(([k]) => k !== 'mobile' && k !== 'desktop')
        .reduce((sum, [, v]) => sum + count(v), 0),
    },
    topResources: arr(o.top_resources)
      .filter(isObj)
      .filter((r) => typeof r.id === 'string' && typeof r.title === 'string')
      .map((r) => ({ id: r.id as string, title: r.title as string, views: count(r.views), downloads: count(r.downloads) }))
      .slice(0, 10),
  }
}

// ---------- 표시용 계산 ----------

/** 0.734 → "73%". null 이면 "-" */
export function formatRate(rate: number | null): string {
  return rate === null ? '-' : `${Math.round(rate * 100)}%`
}

const DAY_MS = 86_400_000
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/** date 가 속한 주의 월요일 (UTC). date_trunc('week') 와 같은 기준 */
export function weekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dow = (d.getUTCDay() + 6) % 7 // 월=0 … 일=6
  return new Date(d.getTime() - dow * DAY_MS)
}

/** 접속 기록이 없는 주도 0 으로 채워, 항상 `weeks`개(오래된 주 → 이번 주)를 돌려준다 */
export function fillWeeks(rows: WeekUsers[], now: Date, weeks = 12): WeekUsers[] {
  const byWeek = new Map(rows.map((r) => [r.week, r.users]))
  const thisWeek = weekStart(now).getTime()
  return Array.from({ length: weeks }, (_, i) => {
    const week = isoDate(new Date(thisWeek - (weeks - 1 - i) * 7 * DAY_MS))
    return { week, users: byWeek.get(week) ?? 0 }
  })
}

/** 값 목록 → 막대 너비(%). 가장 큰 값이 100. 전부 0 이면 전부 0 */
export function barPercents(values: number[]): number[] {
  const max = Math.max(0, ...values)
  return values.map((v) => (max === 0 ? 0 : Math.round((v / max) * 100)))
}

/** 꺾은선 차트 좌표. y 는 아래가 0 이므로 뒤집는다. 점이 하나뿐이어도 x 가 0 으로 나눠지지 않는다 */
export function linePoints(values: number[], width: number, height: number, pad = 8): { x: number; y: number }[] {
  const max = Math.max(1, ...values)
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  return values.map((v, i) => ({
    x: pad + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW),
    y: pad + innerH - (v / max) * innerH,
  }))
}

export interface DonutSlice {
  key: string
  value: number
  percent: number
  /** stroke-dasharray 의 "채움 길이" (둘레를 100 으로 본 값) */
  dash: number
  /** stroke-dashoffset (앞선 조각들의 합의 음수) */
  offset: number
}

/** 도넛 조각. 둘레를 100 으로 정규화한다 (SVG circle 에 pathLength=100 을 준다). 합이 0 이면 빈 배열 */
export function donutSlices(parts: { key: string; value: number }[]): DonutSlice[] {
  const total = parts.reduce((s, p) => s + p.value, 0)
  if (total === 0) return []
  let acc = 0
  return parts
    .filter((p) => p.value > 0)
    .map((p) => {
      const dash = (p.value / total) * 100
      const slice = { key: p.key, value: p.value, percent: Math.round(dash), dash, offset: -acc }
      acc += dash
      return slice
    })
}

/** 접속 기록 중 모바일 비율 (0~100 정수). 기록이 없으면 null */
export function mobilePercent(d: AdminStats['device']): number | null {
  const total = d.mobile + d.desktop + d.other
  return total === 0 ? null : Math.round((d.mobile / total) * 100)
}
