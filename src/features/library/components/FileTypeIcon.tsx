import { File, FileCode, FileImage, FileText, CirclePlay, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileKind } from '../fileType'

const MAP: Record<FileKind, { Icon: typeof File; className: string; label: string }> = {
  pdf: { Icon: FileText, className: 'bg-red-500/15 text-red-300', label: 'PDF' },
  code: { Icon: FileCode, className: 'bg-emerald-500/15 text-emerald-300', label: '코드' },
  video: { Icon: CirclePlay, className: 'bg-sky-500/15 text-sky-300', label: '영상' },
  image: { Icon: FileImage, className: 'bg-amber-500/15 text-amber-300', label: '이미지' },
  link: { Icon: Link2, className: 'bg-violet-500/15 text-violet-300', label: '링크' },
  other: { Icon: File, className: 'bg-white/10 text-gray-300', label: '파일' },
}

export function FileTypeIcon({ kind, size = 'md' }: { kind: FileKind; size?: 'md' | 'lg' }) {
  const { Icon, className, label } = MAP[kind]
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('shrink-0 inline-flex items-center justify-center rounded-xl', size === 'lg' ? 'h-14 w-14' : 'h-11 w-11', className)}
    >
      <Icon size={size === 'lg' ? 28 : 22} />
    </span>
  )
}
