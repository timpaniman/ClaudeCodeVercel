import { describe, expect, test } from 'vitest'
import {
  barPercents,
  donutSlices,
  fillWeeks,
  formatRate,
  linePoints,
  mobilePercent,
  parseAdminStats,
  weekStart,
} from '@/features/admin/stats'

const ID = '11111111-1111-4111-8111-111111111111'

describe('parseAdminStats', () => {
  test('admin_stats RPC 결과를 화면용 값으로 바꾼다', () => {
    const s = parseAdminStats({
      members_active: 4,
      members_pending: 1,
      roster_total: 3,
      roster_claimed: 3,
      signup_rate: 1,
      mau: 4,
      mau_by_cohort: [
        { cohort_number: 17, users: 2 },
        { cohort_number: 12, users: 1 },
      ],
      weekly_visits: [{ week: '2026-09-14', users: 4 }],
      device_ratio: { mobile: 6, desktop: 2, unknown: 1 },
      top_resources: [{ id: ID, title: '8주차 자료', cohort_id: 3, views: '5', downloads: 2 }],
    })
    expect(s).toMatchObject({ membersActive: 4, membersPending: 1, rosterTotal: 3, rosterClaimed: 3, signupRate: 1, mau: 4 })
    expect(s.mauByCohort.map((c) => c.cohortNumber)).toEqual([12, 17]) // 기수 오름차순
    expect(s.device).toEqual({ mobile: 6, desktop: 2, other: 1 })
    expect(s.topResources[0]).toEqual({ id: ID, title: '8주차 자료', views: 5, downloads: 2 }) // 문자열 숫자도 받는다
  })

  test.each([null, undefined, 'x', 42, [], {}])('이상한 입력(%j)에도 0/빈 값으로 안전하게 돌려준다', (raw) => {
    const s = parseAdminStats(raw)
    expect(s.membersActive).toBe(0)
    expect(s.signupRate).toBeNull()
    expect(s.mauByCohort).toEqual([])
    expect(s.weeklyVisits).toEqual([])
    expect(s.topResources).toEqual([])
    expect(s.device).toEqual({ mobile: 0, desktop: 0, other: 0 })
  })

  test('음수·NaN·소수는 0 이하로 막고 정수로 내린다', () => {
    const s = parseAdminStats({ mau: -3, members_active: 'abc', roster_total: 2.9, signup_rate: 7 })
    expect(s.mau).toBe(0)
    expect(s.membersActive).toBe(0)
    expect(s.rosterTotal).toBe(2)
    expect(s.signupRate).toBe(1) // 0~1 로 제한
  })

  test('잘못된 행(기수 0, 형식이 다른 주, id 없는 자료)은 걸러내고 자료는 10개까지만', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ id: `${i}`, title: `t${i}`, views: i, downloads: 0 }))
    const s = parseAdminStats({
      mau_by_cohort: [{ cohort_number: 0, users: 3 }, { cohort_number: 5, users: 1 }, 'bad'],
      weekly_visits: [{ week: 'yesterday', users: 1 }, { week: '2026-09-07', users: 2 }],
      top_resources: [{ title: 'id 없음' }, ...many],
    })
    expect(s.mauByCohort).toEqual([{ cohortNumber: 5, users: 1 }])
    expect(s.weeklyVisits).toEqual([{ week: '2026-09-07', users: 2 }])
    expect(s.topResources).toHaveLength(10)
  })
})

describe('표시용 계산', () => {
  test('formatRate', () => {
    expect(formatRate(null)).toBe('-')
    expect(formatRate(0.734)).toBe('73%')
    expect(formatRate(1)).toBe('100%')
  })

  test('weekStart 는 그 주의 월요일(UTC)', () => {
    expect(weekStart(new Date('2026-09-20T12:00:00Z')).toISOString().slice(0, 10)).toBe('2026-09-14') // 일요일 → 그 주 월요일
    expect(weekStart(new Date('2026-09-14T00:00:00Z')).toISOString().slice(0, 10)).toBe('2026-09-14')
    expect(weekStart(new Date('2026-09-21T00:00:00Z')).toISOString().slice(0, 10)).toBe('2026-09-21')
  })

  test('fillWeeks: 항상 12주, 오래된 주 → 이번 주, 기록 없는 주는 0', () => {
    const now = new Date('2026-09-20T12:00:00Z')
    const w = fillWeeks([{ week: '2026-09-14', users: 4 }, { week: '2026-08-10', users: 2 }, { week: '2020-01-06', users: 9 }], now)
    expect(w).toHaveLength(12)
    expect(w[11]).toEqual({ week: '2026-09-14', users: 4 })
    expect(w[0].week).toBe('2026-06-29')
    expect(w.find((x) => x.week === '2026-08-10')?.users).toBe(2)
    expect(w.filter((x) => x.users === 0)).toHaveLength(10)
    expect(w.map((x) => x.week)).toEqual([...w.map((x) => x.week)].sort()) // 오름차순
  })

  test('barPercents: 최대값이 100, 전부 0 이면 0', () => {
    expect(barPercents([2, 1, 0])).toEqual([100, 50, 0])
    expect(barPercents([0, 0])).toEqual([0, 0])
    expect(barPercents([])).toEqual([])
  })

  test('linePoints: 좌표가 영역 안에 있고 값이 클수록 위(작은 y), 점 1개·전부 0 도 안전', () => {
    const p = linePoints([0, 5, 10], 320, 120, 8)
    expect(p[0].x).toBe(8)
    expect(p[2].x).toBe(312)
    expect(p[0].y).toBeGreaterThan(p[1].y)
    expect(p[1].y).toBeGreaterThan(p[2].y)
    expect(p[2].y).toBe(8)
    expect(linePoints([3], 320, 120)[0].x).toBe(160)
    expect(linePoints([0, 0], 320, 120).every((q) => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true)
  })

  test('donutSlices: 둘레 100 기준으로 이어 붙고, 0 인 조각은 빠지며, 합이 0 이면 빈 배열', () => {
    const s = donutSlices([{ key: 'mobile', value: 3 }, { key: 'desktop', value: 1 }, { key: 'other', value: 0 }])
    expect(s.map((x) => x.key)).toEqual(['mobile', 'desktop'])
    expect(s[0]).toMatchObject({ dash: 75, offset: -0, percent: 75 })
    expect(s[1]).toMatchObject({ dash: 25, offset: -75, percent: 25 })
    expect(donutSlices([{ key: 'a', value: 0 }])).toEqual([])
  })

  test('mobilePercent', () => {
    expect(mobilePercent({ mobile: 3, desktop: 1, other: 0 })).toBe(75)
    expect(mobilePercent({ mobile: 0, desktop: 0, other: 0 })).toBeNull()
  })
})
