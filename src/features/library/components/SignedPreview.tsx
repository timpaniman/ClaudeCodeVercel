'use client'

// Design Ref: §2.4 (PDF 열람) — 데스크톱은 iframe 미리보기, 모바일은 새 화면으로 열기(모바일 Safari 의 iframe PDF 제약).
import { useEffect, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'

async function fetchViewUrl(resourceId: string): Promise<string> {
  const res = await fetch(`/api/resources/${resourceId}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'view' }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message ?? '미리보기를 불러오지 못했습니다.')
  return json.url as string
}

export function SignedPreview({ resourceId, kind, title }: { resourceId: string; kind: 'pdf' | 'image'; title: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchViewUrl(resourceId)
      .then((u) => !cancelled && setUrl(u))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '미리보기를 불러오지 못했습니다.'))
    return () => {
      cancelled = true
    }
  }, [resourceId])

  if (error) {
    return (
      <p role="alert" className="rounded-2xl border border-white/10 bg-white/5 p-5 text-base text-gray-400">
        {error} 아래 다운로드 버튼으로 받아 보실 수 있습니다.
      </p>
    )
  }
  if (!url) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-10 text-gray-400" role="status">
        <Loader2 className="animate-spin" size={18} aria-hidden /> 미리보기를 불러오는 중…
      </div>
    )
  }

  if (kind === 'image') {
    // 서명 URL 은 만료되는 외부 주소라 next/image 최적화 대상이 아니다
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={title} className="max-h-[70vh] w-auto max-w-full rounded-2xl border border-white/10" />
  }

  return (
    <>
      <iframe src={url} title={`${title} 미리보기`} className="hidden lg:block w-full h-[70vh] rounded-2xl border border-white/10 bg-white" data-testid="pdf-preview" />
      <button
        type="button"
        disabled={opening}
        onClick={async () => {
          setOpening(true)
          try {
            window.location.assign(await fetchViewUrl(resourceId))
          } catch {
            setError('PDF를 열지 못했습니다.')
            setOpening(false)
          }
        }}
        className="lg:hidden flex w-full items-center justify-center gap-2 min-h-12 rounded-xl border border-white/15 bg-white/5 text-base font-medium text-gray-100"
      >
        <FileText size={18} aria-hidden /> PDF 열어 보기
      </button>
    </>
  )
}
