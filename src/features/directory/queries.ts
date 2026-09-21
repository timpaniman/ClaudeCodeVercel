// Design Ref: §4.1 — 멤버 디렉토리는 directory_members RPC 로 조회한다 (활성 회원만, 이메일 제외).
import type { ServerClient } from '@/lib/auth/session'
import type { Member } from './members'

export async function loadMembers(supabase: ServerClient, cohortId?: number): Promise<Member[]> {
  const { data, error } = await supabase.rpc('directory_members', cohortId === undefined ? {} : { p_cohort_id: cohortId })
  if (error) throw new Error(`directory_members failed: ${error.message}`)
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    company: r.company,
    position: r.position,
    bio: r.bio,
    avatarUrl: r.avatar_url,
    githubUrl: r.github_url,
    linkedinUrl: r.linkedin_url,
    websiteUrl: r.website_url,
    cohortId: r.cohort_id,
  }))
}
