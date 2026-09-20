// Design §8.3 (L1) — 배포된(또는 로컬) 서버에 HTTP 로 물어 보는 스모크 테스트. 로그인 없이 확인할 수 있는 "보안 경계"와 공개 파일만 다룬다.
// (환경변수 이름이 BASE_URL 이면 vitest 가 "/" 로 덮어쓰므로 SMOKE_URL 을 쓴다)
//   npm run test:smoke                                   → http://localhost:3000 (npm run dev 실행 중일 때)
//   SMOKE_URL=https://내주소.vercel.app npm run test:smoke → 배포본
// 데이터를 바꾸지 않는다(읽기, 그리고 인증 없이 거부되어야 하는 요청만 보낸다).
import { describe, expect, test } from 'vitest'

const BASE = (process.env.SMOKE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

const get = (path: string, init?: RequestInit) => fetch(BASE + path, { redirect: 'manual', ...init })

describe(`스모크 (${BASE})`, () => {
  test('로그인 화면이 열리고 PWA manifest 를 가리킨다', async () => {
    const r = await get('/login')
    expect(r.status).toBe(200)
    const html = await r.text()
    expect(html).toContain('인증 코드 보내기')
    expect(html).toContain('rel="manifest"')
  })

  test.each(['/home', '/library', '/announcements', '/directory', '/me', '/admin', '/admin/roster'])('%s 는 비로그인이면 로그인 화면으로 보낸다', async (path) => {
    const r = await get(path)
    expect(r.status).toBe(307)
    const loc = new URL(r.headers.get('location')!, BASE)
    expect(loc.pathname).toBe('/login')
    expect(loc.searchParams.get('next')).toBe(path)
  })

  test('확장자처럼 끝나는 경로로 로그인 검사를 피할 수 없다', async () => {
    for (const path of ['/adminjs', '/library/xpng', '/homehtml']) {
      const r = await get(path)
      expect([307, 404]).toContain(r.status) // 로그인 화면으로 가거나 없는 페이지. 200 이면 안 된다
    }
  })

  test('PWA 파일은 로그인 없이 열린다', async () => {
    const m = await get('/manifest.json')
    expect(m.status).toBe(200)
    expect((await m.json()).start_url).toBe('/home')
    const sw = await get('/sw.js')
    expect(sw.status).toBe(200)
    expect(sw.headers.get('cache-control')).toContain('no-cache')
    for (const icon of ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png']) {
      const r = await get(icon)
      expect(r.status).toBe(200)
      expect(r.headers.get('content-type')).toBe('image/png')
    }
    expect((await get('/offline.html')).status).toBe(200)
  })

  test('보안 헤더가 붙는다', async () => {
    const r = await get('/login')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(r.headers.get('referrer-policy')).toBeTruthy()
    expect(r.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(r.headers.get('x-frame-options')).toBe('DENY')
  })

  test('cron 은 올바른 Bearer 없이는 401', async () => {
    expect((await get('/api/cron/notify')).status).toBe(401)
    expect((await get('/api/cron/notify', { headers: { authorization: 'Bearer wrong-secret' } })).status).toBe(401)
    expect((await get('/api/cron/notify', { headers: { authorization: 'Basic abc' } })).status).toBe(401)
  })

  test('발송·명단·다운로드 API 는 비로그인이면 401', async () => {
    const json = { 'content-type': 'application/json' }
    expect((await get('/api/admin/publish', { method: 'POST', headers: json, body: '{}' })).status).toBe(401)
    const form = new FormData()
    form.append('file', new Blob(['email,name,cohort_number\na@b.com,x,1']), 'r.csv')
    expect((await get('/api/admin/roster/preview', { method: 'POST', body: form })).status).toBe(401)
    expect((await get('/api/admin/roster/commit', { method: 'POST', headers: json, body: '{}' })).status).toBe(401)
    expect((await get('/api/resources/00000000-0000-4000-8000-000000000001/download', { method: 'POST' })).status).toBe(401)
  })

  test('수신 해제: 위조 토큰은 거부하고, 확인 화면은 로그인 없이 열린다', async () => {
    expect((await get('/api/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 't=forged.token' })).status).toBe(400)
    const page = await get('/unsubscribe?t=forged.token')
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('링크를 확인할 수 없습니다')
  })
})
