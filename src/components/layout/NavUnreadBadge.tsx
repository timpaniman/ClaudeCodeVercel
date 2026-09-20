'use client'

// Design Ref: §5.1 상단바/내비 — 안 읽은 공지 개수 표시. 페이지를 옮길 때마다 다시 센다
// (공지를 읽으면 배지가 바로 줄어든다. 서버 레이아웃은 페이지 이동 시 다시 그려지지 않기 때문에 클라이언트에서 센다).
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { badgeLabel, countUnread } from '@/features/announcements/text'
import { cn } from '@/lib/utils'

const COUNT_LIMIT = 100 // 요청 URL 길이와 부하를 제한한다. 100건을 넘으면 "99+" 로 표시된다.

export function NavUnreadBadge({ userId, className }: { userId: string; className?: string }) {
  const pathname = usePathname()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function load() {
      const { data: published } = await supabase
        .from('announcements')
        .select('id')
        .not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false })
        .limit(COUNT_LIMIT)
      const ids = (published ?? []).map((a) => a.id)
      if (ids.length === 0) return !cancelled && setCount(0)

      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId)
        .in('announcement_id', ids)
      if (!cancelled) setCount(countUnread(ids, (reads ?? []).map((r) => r.announcement_id)))
    }

    void load().catch(() => undefined) // 배지는 부가 기능이라 실패해도 화면은 그대로 둔다
    return () => {
      cancelled = true
    }
  }, [pathname, userId])

  const label = badgeLabel(count)
  if (!label) return null
  return (
    <span
      data-testid="unread-badge"
      aria-label={`안 읽은 공지 ${label}건`}
      className={cn('inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-xs font-bold leading-5 text-white', className)}
    >
      {label}
    </span>
  )
}
