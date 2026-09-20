import Link from 'next/link'
import { Bell } from 'lucide-react'

export default function AnnouncementNotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-gray-400">
        <Bell size={28} aria-hidden />
      </div>
      <h1 className="text-xl font-bold text-white">공지를 찾을 수 없습니다</h1>
      <p className="text-base leading-relaxed text-gray-400">삭제되었거나 아직 게시되지 않은 공지입니다.</p>
      <Link href="/announcements" className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-semibold">
        공지 목록으로
      </Link>
    </div>
  )
}
