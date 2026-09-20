'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Bell, Users, User, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { NavUnreadBadge } from '@/components/layout/NavUnreadBadge'

// Design Ref: §5.1 — v1 내비게이션: 홈 · 자료 · 공지 · 멤버 · 나
export const NAV_ITEMS = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/library', label: '자료', icon: BookOpen },
  { href: '/announcements', label: '공지', icon: Bell },
  { href: '/directory', label: '멤버', icon: Users },
] as const

interface SidebarProps {
  userId?: string
  user?: {
    name: string
    company?: string
    avatarUrl?: string
    cohortNumber?: number
    isAdmin?: boolean
  }
}

const linkClass = (active: boolean) =>
  cn(
    'flex items-center gap-3 px-3 min-h-11 rounded-lg text-base font-medium transition-colors',
    active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5',
  )

export function Sidebar({ user, userId }: SidebarProps) {
  const pathname = usePathname()
  const is = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-gray-950 border-r border-white/10 min-h-screen fixed left-0 top-0 bottom-0">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-sm">AI</div>
        <div>
          <div className="font-bold text-white text-base">AI4CEO</div>
          <div className="text-xs text-gray-400">{user?.cohortNumber ? `${user.cohortNumber}기` : '졸업생 포털'}</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="주 메뉴">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(is(href))} aria-current={is(href) ? 'page' : undefined}>
            <Icon size={18} />
            <span>{label}</span>
            {href === '/announcements' && userId && <NavUnreadBadge userId={userId} className="ml-auto" />}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        {user?.isAdmin && (
          <Link href="/admin" className={linkClass(is('/admin'))}>
            <ShieldCheck size={18} />
            <span>관리자</span>
          </Link>
        )}
        <Link href="/me" className={linkClass(is('/me'))}>
          <User size={18} />
          <span>내 프로필</span>
        </Link>

        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2">
            <Avatar src={user.avatarUrl} name={user.name} size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user.name}</div>
              <div className="text-xs text-gray-400 truncate">{user.company}</div>
            </div>
          </div>
        )}

        <form action="/auth/signout" method="post">
          <button type="submit" className="w-full text-left px-3 min-h-11 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5">
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  )
}
