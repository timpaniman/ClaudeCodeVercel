// 테스트 계정 세션. 로그인은 globalSetup 에서 계정당 1번만 하고(Auth 로그인 요청 한도 회피),
// 토큰을 vitest provide/inject 로 모든 테스트 파일에 공유한다.
// vitest 를 import 하므로 tsx 스크립트(cleanup.ts)에서는 이 파일을 쓰지 않는다.
import { createClient } from '@supabase/supabase-js'
import { inject } from 'vitest'
import type { Database } from '../../src/types/database'
import { SUPABASE_URL, anonKey, type Client, type TestUserKey } from './helpers'

declare module 'vitest' {
  export interface ProvidedContext {
    tokens: Record<TestUserKey, string>
  }
}

/** 해당 계정의 access token 으로 요청하는 클라이언트 (RLS 는 이 JWT 의 role/sub 로 평가된다) */
export async function signedInClient(key: TestUserKey): Promise<Client> {
  const token = inject('tokens')?.[key]
  if (!token) throw new Error(`${key} 토큰이 없습니다. globalSetup 로그인 단계를 확인하세요.`)
  return createClient<Database>(SUPABASE_URL, anonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}
