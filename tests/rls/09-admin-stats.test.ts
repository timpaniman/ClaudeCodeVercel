// Design §3.4 admin_stats — 실제 RPC 결과를 화면용 파서(parseAdminStats)가 읽어 집계가 맞는지 확인한다 (module-6)
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { parseAdminStats, fillWeeks } from '@/features/admin/stats'
import { FIXED, getUserIds, looseService } from './helpers'
import { signedInClient } from './session'

let ids: Awaited<ReturnType<typeof getUserIds>>
const startedAt = new Date(Date.now() - 1000).toISOString()

beforeAll(async () => {
  ids = await getUserIds()
})

afterAll(async () => {
  // 이 테스트가 남긴 활동 기록만 지운다
  await looseService().from('activity_log').delete().gte('created_at', startedAt).in('user_id', Object.values(ids))
})

describe('admin_stats ← activity_log', () => {
  test('접속·열람 기록이 MAU, 주간 접속, 모바일 비율, 인기 자료에 반영된다', async () => {
    const student = await signedInClient('student')
    expect((await student.rpc('log_activity', { p_event: 'visit', p_device: 'mobile' })).error).toBeNull()
    expect((await student.rpc('log_activity', { p_event: 'view_resource', p_ref: FIXED.resource.common, p_device: 'mobile' })).error).toBeNull()
    expect((await student.rpc('record_download', { p_resource: FIXED.resource.common, p_device: 'mobile' })).error).toBeNull()

    const admin = await signedInClient('admin')
    const { data, error } = await admin.rpc('admin_stats', {})
    expect(error).toBeNull()
    const stats = parseAdminStats(data)

    expect(stats.mau).toBeGreaterThanOrEqual(1)
    expect(stats.device.mobile).toBeGreaterThanOrEqual(3)

    // 이번 주 접속자가 12주 채우기 결과의 마지막 칸에 들어온다 (DB 의 주 경계 = 월요일 UTC 와 화면 계산이 같다)
    const weeks = fillWeeks(stats.weeklyVisits, new Date())
    expect(weeks).toHaveLength(12)
    expect(weeks[11].users).toBeGreaterThanOrEqual(1)

    const top = stats.topResources.find((r) => r.id === FIXED.resource.common)
    expect(top).toBeDefined()
    expect(top!.views).toBeGreaterThanOrEqual(1)
    expect(top!.downloads).toBeGreaterThanOrEqual(1)

    // 기수별 접속자: 17기(재학생)가 잡힌다
    expect(stats.mauByCohort.find((c) => c.cohortNumber === 17)?.users).toBeGreaterThanOrEqual(1)
  })
})
