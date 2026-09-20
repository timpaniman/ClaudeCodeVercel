import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-2xl',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizeClass = sizeMap[size]

  if (src) {
    return (
      <div className={cn('relative rounded-full overflow-hidden flex-shrink-0', sizeClass, className)}>
        <Image src={src} alt={name} fill className="object-cover" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white',
        'bg-gradient-to-br from-indigo-500 to-violet-600',
        sizeClass,
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
