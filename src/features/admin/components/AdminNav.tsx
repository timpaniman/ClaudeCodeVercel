'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/admin', label: '대시보드', exact: true },
  { href: '/admin/roster', label: '명단' },
  { href: '/admin/resources', label: '자료' },
  { href: '/admin/announcements', label: '공지' },
  { href: '/admin/approvals', label: '승인 대기', badge: true },
] as const

export function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname()

  return (
    <nav aria-label="관리자 메뉴" className="border-b border-white/10 bg-gray-950 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const active = 'exact' in tab && tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap min-h-12 px-4 text-base font-medium border-b-2 transition-colors',
                active ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white',
              )}
            >
              {tab.label}
              {'badge' in tab && tab.badge && pendingCount > 0 && (
                <span className="bg-indigo-600 text-white text-xs font-semibold rounded-full px-2 py-0.5">{pendingCount}</span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
