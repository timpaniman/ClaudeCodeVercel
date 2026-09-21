// 알림 메일의 언어별 문구. 메일은 크론·서버에서 만들어지므로 next-intl 런타임 대신 문구 파일을 직접 읽는다.
import { defaultLocale, isLocale, type Locale } from '@/i18n/config'
import { messages } from '@/messages'
import type { Category } from '@/features/library/params'

/** 수신자 locale 값(DB 문자열)을 지원 언어로. 모르는 값이면 기본 언어 */
export const localeOf = (value: string | null | undefined): Locale => (isLocale(value) ? value : defaultLocale)

/** "{name}" 자리표시자를 값으로 바꾼다 (복수형 없이 단순 치환만 쓰는 메일 문구 전용) */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole))
}

export const emailCopy = (locale: Locale) => messages[locale].emails

/** 자료 알림 메일의 "12기 · 강의자료" 같은 부제 */
export function resourceMeta(locale: Locale, cohortNumber: number | null, category: Category): string {
  const m = messages[locale]
  const cohort = cohortNumber === null ? m.library.filters.common : fill(m.common.cohort, { number: cohortNumber })
  return `${cohort} · ${m.library.categories[category]}`
}
