// Design Ref: §8 — L0 RLS 테스트 공용 헬퍼.
// 실행 대상은 .env.local / .env 의 NEXT_PUBLIC_SUPABASE_URL 이 가리키는 **dev** 프로젝트이다.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { loadEnv } from 'vite'
import type { Database } from '../../src/types/database'

const ENV = loadEnv('test', process.cwd(), '')

function need(name: string): string {
  const v = ENV[name] || process.env[name]
  if (!v) {
    throw new Error(
      `${name} 가 없습니다. .env.local 에 설정하세요 (SUPABASE_SERVICE_ROLE_KEY 는 대시보드 → Project Settings → API).`,
    )
  }
  return v
}

export const SUPABASE_URL = need('NEXT_PUBLIC_SUPABASE_URL')
const ANON_KEY = need('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const SERVICE_KEY = need('SUPABASE_SERVICE_ROLE_KEY')

export type Client = SupabaseClient<Database>
/** 타입 제약 없이 (일반 회원에게 허용되지 않은 컬럼 수정 시도 등) 호출할 때 사용 */
export type LooseClient = SupabaseClient

const authOpts = { auth: { persistSession: false, autoRefreshToken: false } }

export const serviceClient = (): Client => createClient<Database>(SUPABASE_URL, SERVICE_KEY, authOpts)
/** service role + 타입 제약 없음. profiles.role/status/cohort_id 처럼 앱 타입이 막아 둔 컬럼을 시드·검증에서 직접 다룰 때 */
export const looseService = (): LooseClient => createClient(SUPABASE_URL, SERVICE_KEY, authOpts)
export const anonClient = (): Client => createClient<Database>(SUPABASE_URL, ANON_KEY, authOpts)

/** 테스트 계정 (전부 rls-*@example.com — 실제 메일은 발송되지 않는다) */
export const TEST_USERS = {
  admin: { email: 'rls-admin@example.com', name: 'RLS 운영진', cohort: 17, role: 'admin' },
  student: { email: 'rls-student17@example.com', name: 'RLS 재학생', cohort: 17, role: 'member' },
  grad: { email: 'rls-grad12@example.com', name: 'RLS 졸업생', cohort: 12, role: 'member' },
  pending: { email: 'rls-pending@example.com', name: 'RLS 승인대기', cohort: null, role: 'member' },
} as const
export type TestUserKey = keyof typeof TEST_USERS

export const TEST_EMAIL_PATTERN = /^rls-.*@example\.com$/

/** 계정 비밀번호는 서비스 키에서 파생한다 (하드코딩 없이 실행마다 동일) */
export function passwordFor(email: string): string {
  return createHash('sha256').update(`${SERVICE_KEY}:${email}`).digest('hex').slice(0, 32)
}

export const anonKey = (): string => ANON_KEY

/** 로그인해서 access token 을 얻는다. 한도(rate limit)에 걸리면 잠시 기다렸다 재시도한다. */
export async function loginForToken(key: TestUserKey): Promise<string> {
  const { email } = TEST_USERS[key]
  let lastMessage = ''
  for (let attempt = 1; attempt <= 6; attempt++) {
    const { data, error } = await anonClient().auth.signInWithPassword({ email, password: passwordFor(email) })
    if (!error && data.session) return data.session.access_token
    lastMessage = error?.message ?? 'no session'
    if (!/rate limit/i.test(lastMessage)) break
    console.log(`[rls] ${key} 로그인 한도 도달 — 30초 후 재시도 (${attempt}/6)`)
    await new Promise((r) => setTimeout(r, 30_000))
  }
  throw new Error(`${key} 로그인 실패: ${lastMessage}`)
}

/** 고정 UUID 픽스처 (시드가 매번 초기화한다) */
export const FIXED = {
  resource: {
    c17: '00000000-0000-4000-8000-000000000101',
    c12: '00000000-0000-4000-8000-000000000102',
    common: '00000000-0000-4000-8000-000000000103',
    c12Draft: '00000000-0000-4000-8000-000000000104',
  },
  announcement: {
    published: '00000000-0000-4000-8000-000000000201',
    draft: '00000000-0000-4000-8000-000000000202',
  },
} as const

export const ALL_RESOURCE_IDS = Object.values(FIXED.resource)
export const ALL_ANNOUNCEMENT_IDS = Object.values(FIXED.announcement)

export const STORAGE_PATHS = {
  c17: `17/${FIXED.resource.c17}/rls-test.txt`,
  c12: `12/${FIXED.resource.c12}/rls-test.txt`,
} as const

export async function getUserIds(): Promise<Record<TestUserKey, string>> {
  const svc = serviceClient()
  const emails = Object.values(TEST_USERS).map((u) => u.email)
  const { data, error } = await svc.from('profiles').select('id, email').in('email', emails)
  if (error) throw new Error(`profiles 조회 실패: ${error.message}`)
  const out = {} as Record<TestUserKey, string>
  for (const key of Object.keys(TEST_USERS) as TestUserKey[]) {
    const row = data?.find((r) => r.email === TEST_USERS[key].email)
    if (!row) throw new Error(`${key} 프로필이 없습니다. 시드가 실패했습니다.`)
    out[key] = row.id
  }
  return out
}

export async function cohortIdByNumber(num: number): Promise<number> {
  const { data, error } = await serviceClient().from('cohorts').select('id').eq('number', num).single()
  if (error || !data) throw new Error(`${num}기가 없습니다. 006_seed_cohorts.sql 이 적용됐는지 확인하세요.`)
  return data.id
}

/** 임시 계정 삭제용 (signup 테스트) */
export async function deleteAuthUserByEmail(email: string): Promise<void> {
  const svc = serviceClient()
  const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const user = data?.users.find((u) => u.email === email)
  if (user) await svc.auth.admin.deleteUser(user.id)
}
