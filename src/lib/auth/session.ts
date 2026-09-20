// 서버 전용: 현재 사용자·프로필 조회와 API 권한 검사.
// 접근 규칙의 기준은 DB(RLS)이고, 여기서는 화면 분기와 친절한 401/403 응답을 위해 한 번 더 확인한다.
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/errors'
import type { Database, Tables } from '@/types/database'

export type Profile = Tables<'profiles'>
export type ServerClient = SupabaseClient<Database>

export async function getSessionProfile(): Promise<{
  supabase: ServerClient
  user: User | null
  profile: Profile | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return { supabase, user, profile }
}

type AdminGate =
  | { ok: true; supabase: ServerClient; user: User; profile: Profile }
  | { ok: false; response: ReturnType<typeof apiError> }

/** Route Handler 용: 활성 운영진만 통과. 아니면 401/403 JSON 응답 */
export async function requireAdminApi(): Promise<AdminGate> {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) return { ok: false, response: apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401) }
  if (!profile || profile.status !== 'active' || profile.role !== 'admin') {
    return { ok: false, response: apiError('FORBIDDEN', '운영진만 사용할 수 있습니다.', 403) }
  }
  return { ok: true, supabase, user, profile }
}
