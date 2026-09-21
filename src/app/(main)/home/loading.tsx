import { useTranslations } from 'next-intl'

// Design Ref: §5.4 /home — 로딩 상태(스켈레톤)
export default function HomeLoading() {
  const t = useTranslations('home')
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6" aria-busy="true" aria-label={t('loading')}>
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-5 w-24 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <div className="h-5 w-2/3 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>
      <ul className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="h-11 w-11 rounded-xl bg-white/10 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-white/5 animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
