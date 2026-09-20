import { describe, expect, test } from 'vitest'
import { decideRoute, type GuardProfile } from '@/lib/auth/routeGuard'

const active: GuardProfile = { status: 'active', role: 'member' }
const admin: GuardProfile = { status: 'active', role: 'admin' }
const pending: GuardProfile = { status: 'pending', role: 'member' }
const rejected: GuardProfile = { status: 'rejected', role: 'member' }

const NEXT = { type: 'next' } as const
const to = (path: string, extra: object = {}) => ({ type: 'redirect', to: path, ...extra })

describe('decideRoute — 비로그인', () => {
  test('보호된 경로는 /login 으로, 원래 경로를 next 로 보존한다', () => {
    expect(decideRoute({ pathname: '/library/abc', search: '?q=1', hasUser: false, profile: null })).toEqual(
      to('/login', { next: '/library/abc?q=1' }),
    )
    expect(decideRoute({ pathname: '/admin/roster', hasUser: false, profile: null })).toEqual(
      to('/login', { next: '/admin/roster' }),
    )
  })
  test('/login 과 /auth/* 는 통과, 루트(/)는 next 없이 /login', () => {
    expect(decideRoute({ pathname: '/login', hasUser: false, profile: null })).toEqual(NEXT)
    expect(decideRoute({ pathname: '/auth/confirm', hasUser: false, profile: null })).toEqual(NEXT)
    expect(decideRoute({ pathname: '/', hasUser: false, profile: null })).toEqual(to('/login'))
  })
  test('/api/* 는 리다이렉트하지 않는다 (핸들러가 401 로 응답)', () => {
    expect(decideRoute({ pathname: '/api/admin/roster/preview', hasUser: false, profile: null })).toEqual(NEXT)
  })
})

describe('decideRoute — 수신 해제 링크 (/unsubscribe)', () => {
  test('비로그인·승인 대기·활성 회원 모두 통과한다 (메일 링크는 로그인 상태와 무관)', () => {
    expect(decideRoute({ pathname: '/unsubscribe', search: '?t=abc', hasUser: false, profile: null })).toEqual(NEXT)
    expect(decideRoute({ pathname: '/unsubscribe', hasUser: true, profile: pending })).toEqual(NEXT)
    expect(decideRoute({ pathname: '/unsubscribe', hasUser: true, profile: rejected })).toEqual(NEXT)
    expect(decideRoute({ pathname: '/unsubscribe', hasUser: true, profile: active })).toEqual(NEXT)
    expect(decideRoute({ pathname: '/unsubscribe', hasUser: true, profile: null })).toEqual(NEXT)
  })
  test('비슷한 경로는 예외가 아니다', () => {
    expect(decideRoute({ pathname: '/unsubscribe-admin', hasUser: false, profile: null })).toEqual(to('/login', { next: '/unsubscribe-admin' }))
  })
})

describe('decideRoute — 승인 대기·거절', () => {
  test.each([['pending', pending], ['rejected', rejected]] as const)('%s 는 /pending 만 접근한다', (_n, profile) => {
    expect(decideRoute({ pathname: '/pending', hasUser: true, profile })).toEqual(NEXT)
    for (const p of ['/home', '/library', '/announcements', '/directory', '/me', '/admin', '/login', '/']) {
      expect(decideRoute({ pathname: p, hasUser: true, profile })).toEqual(to('/pending'))
    }
  })
  test('로그아웃(/auth/signout)과 API 는 허용한다', () => {
    expect(decideRoute({ pathname: '/auth/signout', hasUser: true, profile: pending })).toEqual(NEXT)
    expect(decideRoute({ pathname: '/api/anything', hasUser: true, profile: pending })).toEqual(NEXT)
  })
})

describe('decideRoute — 활성 회원', () => {
  test('일반 페이지는 통과한다', () => {
    for (const p of ['/home', '/library', '/library/abc', '/announcements', '/directory', '/me']) {
      expect(decideRoute({ pathname: p, hasUser: true, profile: active })).toEqual(NEXT)
    }
  })
  test('/login · /pending · / 은 /home 으로 보낸다', () => {
    for (const p of ['/login', '/pending', '/']) {
      expect(decideRoute({ pathname: p, hasUser: true, profile: active })).toEqual(to('/home'))
    }
  })
  test('일반 회원은 /admin 이하에 들어갈 수 없고, 운영진은 들어간다', () => {
    expect(decideRoute({ pathname: '/admin', hasUser: true, profile: active })).toEqual(to('/home'))
    expect(decideRoute({ pathname: '/admin/roster', hasUser: true, profile: active })).toEqual(to('/home'))
    expect(decideRoute({ pathname: '/admin', hasUser: true, profile: admin })).toEqual(NEXT)
    expect(decideRoute({ pathname: '/admin/approvals', hasUser: true, profile: admin })).toEqual(NEXT)
  })
  test('/administrator 같은 비슷한 경로는 /admin 규칙에 걸리지 않는다', () => {
    expect(decideRoute({ pathname: '/administrator', hasUser: true, profile: active })).toEqual(NEXT)
  })
})

describe('decideRoute — 프로필 없음(트리거 실패 등)', () => {
  test('/login 은 통과(재시도), 그 밖은 /login?error=no_profile', () => {
    expect(decideRoute({ pathname: '/login', hasUser: true, profile: null })).toEqual(NEXT)
    expect(decideRoute({ pathname: '/home', hasUser: true, profile: null })).toEqual(to('/login', { error: 'no_profile' }))
  })
})
