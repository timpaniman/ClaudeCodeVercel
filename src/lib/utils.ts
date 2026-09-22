import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 앱 언어 코드(en/ko)를 Intl 이 쓰는 지역 코드로 */
export const intlLocale = (locale: string) => (locale === 'ko' ? 'ko-KR' : 'en-US')

export function formatDate(date: string | Date, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

const JUST_NOW: Record<string, string> = { en: 'just now', ko: '방금 전' } // i18n-ignore: 상대 시간의 "방금 전" 은 Intl 이 만들지 않아 여기서 언어별로 둔다

/** "5분 전" / "5 minutes ago". 일주일이 넘으면 날짜로 표시한다 */
export function formatRelativeTime(date: string | Date, locale: string, now: Date = new Date()) {
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'always' })

  if (minutes < 1) return JUST_NOW[locale] ?? JUST_NOW.en
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  if (hours < 24) return rtf.format(-hours, 'hour')
  if (days < 7) return rtf.format(-days, 'day')
  return formatDate(date, locale)
}

/** 기수 번호에 따른 Tailwind 색상 클래스 */
export function getCohortColor(cohortNumber: number): string {
  const colors = [
    'bg-green-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-slate-500',
  ]
  return colors[(cohortNumber - 1) % colors.length]
}
