import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { decideInstallMode } from '@/lib/pwa'

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), 'utf8')

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
const IPHONE_KAKAO = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.0'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Mobile Safari/537.36'
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36'

describe('decideInstallMode', () => {
  test('이미 설치해 실행 중이면 안내하지 않는다', () => {
    expect(decideInstallMode({ userAgent: IPHONE_SAFARI, standalone: true, hasInstallPrompt: false })).toBe('installed')
  })
  test('Chrome 계열이 설치 이벤트를 주면 버튼을 보여 준다', () => {
    expect(decideInstallMode({ userAgent: ANDROID_CHROME, standalone: false, hasInstallPrompt: true })).toBe('prompt')
    expect(decideInstallMode({ userAgent: DESKTOP, standalone: false, hasInstallPrompt: true })).toBe('prompt')
  })
  test('iPhone Safari 는 공유 → 홈 화면에 추가 안내', () => {
    expect(decideInstallMode({ userAgent: IPHONE_SAFARI, standalone: false, hasInstallPrompt: false })).toBe('ios')
  })
  test('iPhone 의 카카오톡·Chrome 은 Safari 로 열도록 안내', () => {
    expect(decideInstallMode({ userAgent: IPHONE_KAKAO, standalone: false, hasInstallPrompt: false })).toBe('ios-other-browser')
    expect(decideInstallMode({ userAgent: IPHONE_CHROME, standalone: false, hasInstallPrompt: false })).toBe('ios-other-browser')
  })
  test('설치 이벤트가 없는 안드로이드·PC 는 아무것도 보이지 않는다', () => {
    expect(decideInstallMode({ userAgent: ANDROID_CHROME, standalone: false, hasInstallPrompt: false })).toBe('none')
    expect(decideInstallMode({ userAgent: DESKTOP, standalone: false, hasInstallPrompt: false })).toBe('none')
  })
})

describe('manifest.json', () => {
  const m = JSON.parse(read('public/manifest.json'))
  test('설치 가능 조건: 이름·시작 주소·standalone·192/512 아이콘', () => {
    expect(m.name).toBeTruthy()
    expect(m.short_name.length).toBeLessThanOrEqual(12)
    expect(m.start_url).toBe('/home')
    expect(m.display).toBe('standalone')
    const sizes = m.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true)
  })
  test('아이콘은 실제 PNG 파일이고 선언한 크기와 같다', () => {
    for (const icon of m.icons as { src: string; sizes: string }[]) {
      const buf = readFileSync(join(root, 'public', icon.src))
      expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a') // PNG 시그니처
      const [w, h] = icon.sizes.split('x').map(Number)
      expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([w, h]) // IHDR 의 가로·세로
    }
  })
  test('layout 의 apple-touch-icon 도 실제 파일이다 (180x180)', () => {
    const layout = read('src/app/layout.tsx')
    const src = /apple: '([^']+)'/.exec(layout)![1]
    const buf = readFileSync(join(root, 'public', src))
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([180, 180])
  })
})

describe('서비스 워커 (개인정보 보호 불변식)', () => {
  const sw = read('public/sw.js')
  test('페이지 이동 요청에만 개입하고, 응답을 캐시에 저장하는 곳은 설치 시 오프라인 페이지 한 곳뿐', () => {
    expect(sw).toContain("req.mode !== 'navigate'")
    expect(sw).not.toMatch(/cache\.put\(/)
    expect(sw.match(/cache\.add\(/g)).toHaveLength(1)
    expect(sw).toContain("redirect: 'error'")
  })
  test('오프라인 페이지가 실제로 있고 외부 파일에 의존하지 않는다', () => {
    const html = read('public/offline.html')
    expect(html).toContain('<style>')
    expect(html).not.toMatch(/<link[^>]+stylesheet/i)
    expect(html).not.toMatch(/<script/i)
  })
})

describe('미들웨어 matcher', () => {
  const src = read('src/middleware.ts')
  // 소스의 문자열 리터럴에서 역슬래시가 두 개(\\)로 적혀 있으므로 하나로 줄여 정규식으로 쓴다
  const BACKSLASH = String.fromCharCode(92)
  const line = src.split('\n').find((l) => l.includes('(?!_next/static'))!
  const pattern = line.slice(line.indexOf("'") + 1, line.lastIndexOf("'")).split(BACKSLASH + BACKSLASH).join(BACKSLASH)
  const re = new RegExp('^' + pattern + '$')
  test.each(['/sw.js', '/offline.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-maskable-512.png', '/_next/static/chunks/a.js'])('%s 는 로그인 검사를 거치지 않는다', (p) => {
    expect(re.test(p)).toBe(false)
  })
  // 점(.)이 글자 그대로여야 한다: 확장자처럼 끝나는 글자만 있는 경로(/adminjs)가 로그인 검사를 피하면 안 된다
  test.each(['/home', '/library', '/admin', '/login', '/api/admin/publish', '/adminjs', '/library/xpng'])('%s 는 검사 대상', (p) => {
    expect(re.test(p)).toBe(true)
  })
})
