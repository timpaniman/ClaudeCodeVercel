import { cn, getCohortColor } from '@/lib/utils'

interface CohortBadgeProps {
  cohortNumber: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CohortBadge({ cohortNumber, size = 'md', className }: CohortBadgeProps) {
  const colorClass = getCohortColor(cohortNumber)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold text-white',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-0.5 text-xs',
        size === 'lg' && 'px-3 py-1 text-sm',
        colorClass,
        className
      )}
    >
      {cohortNumber}기
    </span>
  )
}
