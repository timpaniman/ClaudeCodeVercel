// Design §8.3 (L1) — 로그인한 사용자로 API 를 호출하는 테스트. 개발 서버(npm run dev)와 dev Supabase 프로젝트의 RLS 테스트 계정이 필요하다.
//   1) npm run dev            (다른 터미널)
//   2) npm run test:rls       (테스트 계정·자료 픽스처를 만든다 — 이미 있으면 생략 가능)
//   3) npm run test:api
// 운영(실제 회원 데이터)에는 실행하지 않는다: .env.local 의 dev 프로젝트를 쓰고, 서버도 그 프로젝트에 연결되어 있어야 한다.
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { loadEnv } from 'vite'
import { FIXED, SUPABASE_URL, TEST_USERS, anonClient, getUserIds, looseService, passwordFor, type TestUserKey } from '../rls/helpers'
import { signUnsubscribeToken } from '@/features/notifications/unsubscribe'

const ENV = loadEnv('test', process.cwd(), '')
const SERVER = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
const MAX_CHUNK = 3180 // @supabase/ssr 쿠키 분할 단위

const cookies: Partial<Record<TestUserKey, string>> = {}
let ids: Awaited<ReturnType<typeof getUserIds>>

async function cookieHeaderFor(key: TestUserKey): Promise<string> {
  const { email } = TEST_USERS[key]
  const { data, error } = await anonClient().auth.signInWithPassword({ email, password: passwordFor(email) })
  if (error || !data.session) throw new Error(`${key} 로그인 실패: ${error?.message}`)
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0]
  const name = `sb-${ref}-auth-token`
  const value = 'base64-' + Buffer.from(JSON.stringify(data.session), 'utf8').toString('base64url')
  const parts = value.length <= MAX_CHUNK ? [[name, value]] : Array.from({ length: Math.ceil(value.length / MAX_CHUNK) }, (_, i) => [`${name}.${i}`, value.slice(i * MAX_CHUNK, (i + 1) * MAX_CHUNK)])
  return parts.map(([n, v]) => `${n}=${v}`).join('; ')
}

const call = (path: string, as: TestUserKey | null, init: RequestInit = {}) =>
  fetch(SERVER + path, { redirect: 'manual', ...init, headers: { ...(init.headers as Record<string, string>), ...(as ? { cookie: cookies[as]! } : {}) } })

const csvForm = (csv: string, name = 'roster.csv') => {
  const f = new FormData()
  f.append('file', new Blob([csv], { type: 'text/csv' }), name)
  return f
}

beforeAll(async () => {
  const ping = await fetch(SERVER + '/login', { redirect: 'manual' }).catch(() => null)
  if (!ping) throw new Error(`서버(${SERVER})에 연결할 수 없습니다. 다른 터미널에서 npm run dev 를 실행해 주세요.`)
  ids = await getUserIds()
  for (const key of ['admin', 'student', 'grad', 'pending'] as const) cookies[key] = await cookieHeaderFor(key)
}, 120_000)

afterAll(async () => {
  await looseService().from('profiles').update({ notify_announcement: true, notify_new_resource: true }).eq('id', ids.student)
})

describe('/api/admin/roster/preview', () => {
  test('#1 운영진이 정상 CSV 를 올리면 200 과 정상 행 수', async () => {
    const r = await call('/api/admin/roster/preview', 'admin', { method: 'POST', body: csvForm('email,name,cohort_number\napi-test-1@example.com,홍길동,17\napi-test-2@example.com,김대표,12\n') })
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.summary).toMatchObject({ total: 2, ok: 2, invalid: 0 })
  })

  test('#2 잘못된 이메일·중복·없는 기수는 행별로 표시하고, 형식이 다른 파일은 400', async () => {
    const csv = 'email,name,cohort_number\nnot-an-email,가,17\napi-dup@example.com,나,17\napi-dup@example.com,다,17\napi-cohort@example.com,라,99\napi-fine@example.com,마,17\n'
    const r = await call('/api/admin/roster/preview', 'admin', { method: 'POST', body: csvForm(csv) })
    expect(r.status).toBe(200)
    const { summary, rows } = await r.json()
    expect(summary).toMatchObject({ total: 5, ok: 2, duplicateInFile: 1, invalid: 2 })
    expect(rows.find((x: { email: string }) => x.email === 'api-cohort@example.com').status).toBe('invalid')

    expect((await call('/api/admin/roster/preview', 'admin', { method: 'POST', body: csvForm('a,b,c\n1,2,3\n') })).status).toBe(400) // 필수 열(이메일·이름·기수)이 없는 헤더는 파일 전체를 거부
    expect((await call('/api/admin/roster/preview', 'admin', { method: 'POST', body: csvForm('x', 'notes.pdf') })).status).toBe(400) // 확장자
    expect((await call('/api/admin/roster/preview', 'admin', { method: 'POST', body: new FormData() })).status).toBe(400) // 파일 없음
  })

  test('#3 운영진이 아니면 403 (일반 회원·졸업생·승인 대기), 비로그인은 401', async () => {
    for (const who of ['student', 'grad', 'pending'] as const) {
      expect((await call('/api/admin/roster/preview', who, { method: 'POST', body: csvForm('email,name,cohort_number\na@example.com,x,17\n') })).status).toBe(403)
      expect((await call('/api/admin/roster/commit', who, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows: [] }) })).status).toBe(403)
      expect((await call('/api/admin/publish', who, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'resource', id: FIXED.resource.c17 }) })).status).toBe(403)
    }
    expect((await call('/api/admin/roster/preview', null, { method: 'POST', body: csvForm('x') })).status).toBe(401)
  })
})

describe('/api/resources/:id/download', () => {
  test('#4 열람 권한이 있는 회원은 200 과 주소를 받고 다운로드 수가 1 늘고 로그가 남는다', async () => {
    const svc = looseService()
    const before = await svc.from('resources').select('download_count').eq('id', FIXED.resource.c17).single()
    const r = await call(`/api/resources/${FIXED.resource.c17}/download`, 'student', { method: 'POST' })
    expect(r.status).toBe(200)
    expect((await r.json()).url).toMatch(/^https:\/\//)
    const after = await svc.from('resources').select('download_count').eq('id', FIXED.resource.c17).single()
    expect((after.data?.download_count ?? 0) - (before.data?.download_count ?? 0)).toBe(1)
    const { data: log } = await svc.from('activity_log').select('id').eq('user_id', ids.student).eq('event', 'download_resource').eq('ref_id', FIXED.resource.c17).limit(1)
    expect(log?.length).toBe(1)
  })

  test('#5 다른 기수(재학생이 졸업 기수 자료)·미공개·승인 대기·비로그인은 받을 수 없다', async () => {
    expect((await call(`/api/resources/${FIXED.resource.c12}/download`, 'student', { method: 'POST' })).status).not.toBe(200) // 재학생 → 타 기수
    expect((await call(`/api/resources/${FIXED.resource.c12Draft}/download`, 'student', { method: 'POST' })).status).toBe(404) // 미공개는 존재 자체를 숨긴다
    expect((await call(`/api/resources/${FIXED.resource.c17}/download`, 'pending', { method: 'POST' })).status).toBe(403)
    expect((await call(`/api/resources/${FIXED.resource.c17}/download`, null, { method: 'POST' })).status).toBe(401)
    expect((await call('/api/resources/not-a-uuid/download', 'student', { method: 'POST' })).status).toBe(404)
  })
})

describe('/api/unsubscribe', () => {
  test('#8 변조 토큰은 400, 정상 토큰은 해당 알림만 끈다 (원클릭 POST 도 동작)', async () => {
    const secret = ENV.UNSUBSCRIBE_HMAC_SECRET
    expect(secret && secret.length >= 16).toBeTruthy()
    const svc = looseService()
    const form = (t: string) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `t=${encodeURIComponent(t)}` })

    const good = signUnsubscribeToken(secret, { u: ids.student, s: 'announcement' })
    const [body, sig] = good.split('.')
    expect((await call('/api/unsubscribe', null, form(`${body}.${sig.slice(0, -2)}xx`))).status).toBe(400) // 서명 변조
    expect((await call('/api/unsubscribe', null, form(`${Buffer.from(JSON.stringify({ u: ids.grad, s: 'announcement' })).toString('base64url')}.${sig}`))).status).toBe(400) // 본문 바꿔치기
    const still = await svc.from('profiles').select('notify_announcement').eq('id', ids.student).single()
    expect(still.data?.notify_announcement).toBe(true)

    const ok = await call('/api/unsubscribe', null, form(good))
    expect(ok.status).toBe(303)
    const off = await svc.from('profiles').select('notify_announcement, notify_new_resource').eq('id', ids.student).single()
    expect(off.data).toMatchObject({ notify_announcement: false, notify_new_resource: true }) // 자료 알림은 그대로

    await svc.from('profiles').update({ notify_announcement: true }).eq('id', ids.student)
    const oneClick = await call('/api/unsubscribe', null, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `t=${encodeURIComponent(good)}&List-Unsubscribe=One-Click` })
    expect(oneClick.status).toBe(200)
    expect(await oneClick.text()).toBe('OK')
  })
})

describe('/api/cron/notify', () => {
  test('#6 Bearer 가 없거나 틀리면 401, 올바르면 200', async () => {
    expect((await call('/api/cron/notify', null)).status).toBe(401)
    expect((await call('/api/cron/notify', null, { headers: { authorization: 'Bearer wrong' } })).status).toBe(401)
    const secret = ENV.CRON_SECRET
    expect(secret && secret.length >= 16).toBeTruthy()
    const ok = await call('/api/cron/notify', null, { headers: { authorization: `Bearer ${secret}` } })
    expect(ok.status).toBe(200)
    expect(await ok.json()).toHaveProperty('processed')
  })
})
