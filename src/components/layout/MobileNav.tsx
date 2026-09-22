'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Home, BookOpen, Bell, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NavUnreadBadge } from '@/components/layout/NavUnreadBadge'

// Design Ref: §5.1 — 모바일 하단 탭 5개. 터치 영역 44px 이상.
const MOBILE_NAV = [
  { href: '/home', label: 'home', icon: Home },
  { href: '/library', label: 'library', icon: BookOpen },
  { href: '/announcements', label: 'announcements', icon: Bell },
  { href: '/directory', label: 'directory', icon: Users },
  { href: '/me', label: 'me', icon: User },
]

export function MobileNav({ userId }: { userId?: string }) {
  const t = useTranslations('nav')
  const pathname = usePathname()

  return (
    <nav aria-label={t('bottomMenu')} className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-white/10 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around px-1">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 min-h-14 rounded-xl transition-colors',
                active ? 'text-green-400' : 'text-gray-400',
              )}
            >
              <span className="relative">
                <Icon size={22} />
                {href === '/announcements' && userId && <NavUnreadBadge userId={userId} className="absolute -top-2 left-3" />}
              </span>
              <span className="text-xs font-medium">{t(label)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
