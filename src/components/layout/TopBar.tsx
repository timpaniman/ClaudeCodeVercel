'use client'

import { Search, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  crumb?: string
  className?: string
}

export function TopBar({ title, crumb, className }: TopBarProps) {
  return (
    <header className={cn('flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-gray-950/80 backdrop-blur sticky top-0 z-40', className)}>
      {crumb && (
        <>
          <span className="text-sm text-gray-500">{crumb}</span>
          <span className="text-gray-700 text-sm">›</span>
        </>
      )}
      <h1 className="text-lg font-bold text-white flex-1">{title}</h1>

      <div className="flex items-center gap-2">
        {/* 검색 */}
        <div className="hidden md:flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 text-sm text-gray-400 border border-white/10">
          <Search size={14} />
          <span>검색…</span>
          <kbd className="text-xs bg-white/10 px-1 rounded">⌘K</kbd>
        </div>

        {/* 알림 */}
        <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
