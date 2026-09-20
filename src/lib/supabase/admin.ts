// Design Ref: §7.3 — service role 키는 이 파일에서만 사용한다.
// RLS 를 우회하므로 서버 코드(Route Handler, Server Action, 스크립트)에서만 import 할 것.
// 클라이언트 컴포넌트에서 import 하면 아래 가드가 즉시 오류를 낸다.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient()는 서버에서만 사용할 수 있습니다.')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.')
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
