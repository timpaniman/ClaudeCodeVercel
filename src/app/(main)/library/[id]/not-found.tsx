import Link from 'next/link'
import { Lock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

// Design Ref: §5.4 — "권한 없음"과 "없는 자료"를 구분하지 않는다 (자료 존재 여부 노출 방지)
export default async function ResourceNotFound() {
  const t = await getTranslations('library.notFound')
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-gray-400">
        <Lock size={28} aria-hidden />
      </div>
      <h1 className="text-xl font-bold text-white">{t('title')}</h1>
      <p className="text-base leading-relaxed text-gray-400">
        {t('body')}
      </p>
      <Link href="/library" className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-semibold">
        {t('back')}
      </Link>
    </div>
  )
}
