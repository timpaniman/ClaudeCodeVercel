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

  // 아바타 업로드는 v1 에서 쓰지 않는다. 값이 있어도 https 주소만 그리고(외부 호스트가 next/image 예외로 화면 전체를 깨뜨리지 않도록 일반 img 사용),
  // Referer 를 보내지 않는다. 그 외 값은 이니셜로 대체한다.
  if (src && src.startsWith('https://') && !src.includes(' ')) {
    return (
      <div className={cn('relative rounded-full overflow-hidden flex-shrink-0', sizeClass, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} referrerPolicy="no-referrer" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
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
