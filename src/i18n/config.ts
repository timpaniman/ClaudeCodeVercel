// Plan: docs/01-plan/features/portal-i18n-en.plan.md — 지원 언어와 기본값. 영어가 기본이다.
export const locales = ['en', 'ko'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

/** 언어 선택을 저장하는 쿠키 (URL 에 언어 접두사를 붙이지 않으므로 기존 주소·메일 링크가 바뀌지 않는다) */
export const LOCALE_COOKIE = 'NEXT_LOCALE'
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (locales as readonly string[]).includes(v)

/** 쿠키 값(없거나 이상하면 기본 언어)을 언어로 */
export const resolveLocale = (cookieValue: string | undefined | null): Locale => (isLocale(cookieValue) ? cookieValue : defaultLocale)

/** 브라우저 컴포넌트에서 쓰는 쿠키 문자열 (HttpOnly 가 아니다 — 민감 정보가 아님) */
export const localeCookieString = (locale: Locale) => `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
