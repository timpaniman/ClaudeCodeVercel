import Link from 'next/link'
import { Download } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { CohortBadge } from '@/components/ui/CohortBadge'
import { formatDate } from '@/lib/utils'
import type { ResourceListItem } from '../queries'
import { FileTypeIcon } from './FileTypeIcon'
import { Highlight } from './Highlight'

// Design Ref: §5.4 /library — 파일 아이콘 · 제목 · 기수 배지 · 날짜 · 다운로드 수
export function ResourceItem({ item, query }: { item: ResourceListItem; query: string }) {
  const t = useTranslations('library')
  const locale = useLocale()
  const date = item.publishedAt ?? item.createdAt

  return (
    <li>
      <Link
        href={`/library/${item.id}`}
        className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 min-h-[5.5rem] hover:bg-white/10 transition-colors"
      >
        <FileTypeIcon kind={item.kind} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="text-base font-semibold text-white leading-snug break-words">
            <Highlight text={item.title} query={query} />
          </h3>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
            {item.cohortNumber !== null ? (
              <CohortBadge cohortNumber={item.cohortNumber} size="sm" />
            ) : (
              <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-gray-200">{t('filters.common')}</span>
            )}
            <span>{t(`categories.${item.category}`)}</span>
            {item.weekNumber !== null && <span>· {t('item.week', { number: item.weekNumber })}</span>}
            <span>· {formatDate(date, locale)}</span>
            <span className="inline-flex items-center gap-1">
              · <Download size={13} aria-hidden /> <span aria-label={t('item.downloads', { count: item.downloadCount })}>{item.downloadCount}</span>
            </span>
          </div>

          {item.description && (
            <p className="text-sm text-gray-400 line-clamp-2">
              <Highlight text={item.description} query={query} />
            </p>
          )}
        </div>
      </Link>
    </li>
  )
}
