// Design Ref: §4.1 (직접 호출, RLS로 보호) — 공지 조회. 회원은 RLS 가 게시된 공지만 보여 주고,
// 운영진은 임시저장도 보이므로 회원 화면에서는 published_at 조건을 명시해 같은 결과를 보여 준다.
import type { ServerClient } from '@/lib/auth/session'
import type { Tables } from '@/types/database'

export type AnnouncementRow = Tables<'announcements'>

export interface AnnouncementListItem {
  id: string
  title: string
  body: string
  isPinned: boolean
  publishedAt: string
  read: boolean
}

export const ANNOUNCEMENT_PAGE_SIZE = 20

/** 게시된 공지: 고정 공지가 위, 그다음 최신순. 읽음 여부를 함께 돌려준다. */
export async function listAnnouncements(
  supabase: ServerClient,
  userId: string,
  opts: { limit?: number; pinnedFirst?: boolean } = {},
): Promise<{ items: AnnouncementListItem[]; total: number }> {
  const limit = opts.limit ?? ANNOUNCEMENT_PAGE_SIZE

  let q = supabase
    .from('announcements')
    .select('id, title, body, is_pinned, published_at', { count: 'exact' })
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
  if (opts.pinnedFirst !== false) q = q.order('is_pinned', { ascending: false })
  const { data, error, count } = await q.order('published_at', { ascending: false }).range(0, limit - 1)
  if (error) throw new Error(`announcements query failed: ${error.message}`)

  const rows = data ?? []
  let readIds = new Set<string>()
  if (rows.length > 0) {
    const { data: reads, error: readErr } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId)
      .in('announcement_id', rows.map((r) => r.id))
    if (readErr) throw new Error(`announcement_reads query failed: ${readErr.message}`)
    readIds = new Set((reads ?? []).map((r) => r.announcement_id))
  }

  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      isPinned: r.is_pinned,
      publishedAt: r.published_at as string,
      read: readIds.has(r.id),
    })),
    total: count ?? rows.length,
  }
}

/** RLS 가 열람 권한을 판단한다 (회원에게 임시저장 공지는 조회되지 않는다) */
export async function getAnnouncement(supabase: ServerClient, id: string): Promise<AnnouncementRow | null> {
  const { data, error } = await supabase.from('announcements').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`announcements query failed: ${error.message}`)
  return data
}
