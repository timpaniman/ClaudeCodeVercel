import { File, FileCode, FileImage, FileText, CirclePlay, Link2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { FileKind } from '../fileType'

const MAP: Record<FileKind, { Icon: typeof File; className: string }> = {
  pdf: { Icon: FileText, className: 'bg-red-500/15 text-red-300' },
  code: { Icon: FileCode, className: 'bg-emerald-500/15 text-emerald-300' },
  video: { Icon: CirclePlay, className: 'bg-sky-500/15 text-sky-300' },
  image: { Icon: FileImage, className: 'bg-amber-500/15 text-amber-300' },
  link: { Icon: Link2, className: 'bg-violet-500/15 text-violet-300' },
  other: { Icon: File, className: 'bg-white/10 text-gray-300' },
}

export function FileTypeIcon({ kind, size = 'md' }: { kind: FileKind; size?: 'md' | 'lg' }) {
  const t = useTranslations('library.fileKinds')
  const { Icon, className } = MAP[kind]
  return (
    <span
      role="img"
      aria-label={t(kind)}
      className={cn('shrink-0 inline-flex items-center justify-center rounded-xl', size === 'lg' ? 'h-14 w-14' : 'h-11 w-11', className)}
    >
      <Icon size={size === 'lg' ? 28 : 22} />
    </span>
  )
}
