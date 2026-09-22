import Link from 'next/link'
import { Pin } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { cn, formatDate } from '@/lib/utils'
import { excerptOf } from '../text'
import type { AnnouncementListItem } from '../queries'

// Design Ref: §5.4 /announcements — 고정 공지(핀), 안 읽음 점, 게시일
export function AnnouncementItem({ item }: { item: AnnouncementListItem }) {
  const t = useTranslations('announcements')
  const locale = useLocale()
  return (
    <li>
      <Link
        href={`/announcements/${item.id}`}
        className={cn(
          'block rounded-2xl border p-4 min-h-[5rem] transition-colors hover:bg-white/10',
          item.isPinned ? 'border-green-500/30 bg-green-600/10' : 'border-white/10 bg-white/5',
        )}
      >
        <div className="flex items-start gap-2">
          {!item.read && (
            <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-green-400" role="img" aria-label={t('unread')} data-testid="unread-dot" />
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <h3 className={cn('text-base leading-snug break-words', item.read ? 'font-medium text-gray-200' : 'font-semibold text-white')}>
              {item.isPinned && <Pin size={14} className="mr-1.5 inline -mt-0.5 text-green-300" aria-label={t('pinned')} />}
              {item.title}
            </h3>
            <p className="text-sm text-gray-400 line-clamp-2">{excerptOf(item.body, 120)}</p>
            <p className="text-sm text-gray-500">{formatDate(item.publishedAt, locale)}</p>
          </div>
        </div>
      </Link>
    </li>
  )
}
