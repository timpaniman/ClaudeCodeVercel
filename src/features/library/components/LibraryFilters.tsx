'use client'

// Design Ref: §5.4 /library — 검색(300ms debounce) · 기수 칩(잠금 표시) · 카테고리 탭 · 주차 · 정렬.
// 상태는 URL 쿼리스트링이 기준이다. 칩·탭은 링크라서 뒤로가기와 공유가 그대로 동작한다.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Lock, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORIES, DEFAULT_PARAMS, MAX_WEEK, toSearchString, type LibraryParams } from '../params'
import type { CohortInfo } from '../queries'

interface Props {
  params: LibraryParams
  cohorts: CohortInfo[]
  /** 열람 권한이 없어 잠금 표시할 기수 번호 (재학생의 타 기수) */
  lockedNumbers: number[]
}

const chip = (active: boolean) =>
  cn(
    'inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-full text-base font-medium whitespace-nowrap transition-colors',
    active ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10',
  )

const selectClass =
  'min-h-11 bg-gray-900 border border-white/15 rounded-xl px-3 text-base text-white focus:outline-none focus:border-green-500'

export function LibraryFilters({ params, cohorts, lockedNumbers }: Props) {
  const t = useTranslations('library')
  const tc = useTranslations('common')
  const router = useRouter()
  const [q, setQ] = useState(params.q)
  const lastPushed = useRef(params.q)
  const locked = new Set(lockedNumbers)

  const href = (overrides: Partial<LibraryParams>) => `/library${toSearchString(params, overrides)}`

  // 입력 후 300ms 뒤에 URL 을 갱신한다
  useEffect(() => {
    const next = q.replace(/\s+/g, ' ').trim()
    if (next === params.q) return
    const t = setTimeout(() => {
      lastPushed.current = next
      router.replace(`/library${toSearchString(params, { q: next })}`, { scroll: false })
    }, 300)
    return () => clearTimeout(t)
  }, [q, params, router])

  // 뒤로가기·필터 초기화 등 외부 이동으로 검색어가 바뀌면 입력칸도 맞춘다 (입력 중인 글자는 덮어쓰지 않는다)
  useEffect(() => {
    if (params.q !== lastPushed.current) {
      lastPushed.current = params.q
      setQ(params.q)
    }
  }, [params.q])

  const filtered =
    params.q !== '' || params.cohort !== null || params.category !== null || params.week !== null || params.sort !== 'latest'

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.label')}
          maxLength={100}
          className="w-full min-h-12 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* 기수 */}
      <div role="group" aria-label={t('filters.cohort')} className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        <Link href={href({ cohort: null })} scroll={false} className={chip(params.cohort === null)} aria-current={params.cohort === null ? 'true' : undefined}>
          {t('filters.all')}
        </Link>
        <Link href={href({ cohort: 'common' })} scroll={false} className={chip(params.cohort === 'common')} aria-current={params.cohort === 'common' ? 'true' : undefined}>
          {t('filters.common')}
        </Link>
        {cohorts.map((c) =>
          locked.has(c.number) ? (
            <span key={c.id} aria-disabled="true" title={t('filters.lockedTitle')} className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full text-base whitespace-nowrap bg-white/[0.03] text-gray-600 cursor-not-allowed">
              <Lock size={14} aria-hidden /> {tc('cohort', { number: c.number })}
              <span className="sr-only">{t('filters.lockedSr')}</span>
            </span>
          ) : (
            <Link key={c.id} href={href({ cohort: c.number })} scroll={false} className={chip(params.cohort === c.number)} aria-current={params.cohort === c.number ? 'true' : undefined}>
              {tc('cohort', { number: c.number })}
            </Link>
          ),
        )}
      </div>

      {/* 카테고리 */}
      <div role="tablist" aria-label={t('filters.category')} className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        <Link role="tab" aria-selected={params.category === null} href={href({ category: null })} scroll={false} className={chip(params.category === null)}>
          {t('filters.all')}
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c} role="tab" aria-selected={params.category === c} href={href({ category: c })} scroll={false} className={chip(params.category === c)}>
            {t(`categories.${c}`)}
          </Link>
        ))}
      </div>

      {/* 주차 · 정렬 */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="week">{t('filters.week')}</label>
        <select id="week" value={params.week ?? ''} onChange={(e) => router.push(href({ week: e.target.value ? Number(e.target.value) : null }), { scroll: false })} className={selectClass}>
          <option value="">{t('filters.allWeeks')}</option>
          {Array.from({ length: MAX_WEEK }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>
              {t('filters.weekOption', { number: w })}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="sort">{t('filters.sort')}</label>
        <select id="sort" value={params.sort} onChange={(e) => router.push(href({ sort: e.target.value === 'downloads' ? 'downloads' : 'latest' }), { scroll: false })} className={selectClass}>
          <option value="latest">{t('filters.latest')}</option>
          <option value="downloads">{t('filters.downloads')}</option>
        </select>

        {filtered && (
          <Link href={`/library${toSearchString(DEFAULT_PARAMS)}`} className="inline-flex items-center gap-1 min-h-11 px-2 text-base text-gray-400 hover:text-white">
            <X size={16} aria-hidden /> {t('clearFilters')}
          </Link>
        )}
      </div>
    </div>
  )
}
