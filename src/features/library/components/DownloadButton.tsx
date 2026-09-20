'use client'

// Design Ref: §5.4 /library/[id] — 다운로드 버튼. 서버 API 를 거쳐 서명 URL 을 받아 이동한다(직접 링크 노출 없음).
import { useState } from 'react'
import { Download, ExternalLink, Loader2 } from 'lucide-react'

const buttonClass =
  'inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-base font-semibold transition-colors'

function post(resourceId: string, mode: 'download' | 'view', keepalive = false) {
  return fetch(`/api/resources/${resourceId}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
    keepalive,
  })
}

export function DownloadButton({ resourceId }: { resourceId: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await post(resourceId, 'download')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? '다운로드하지 못했습니다.')
      window.location.assign(json.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : '다운로드하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={onClick} disabled={busy} className={buttonClass} data-testid="download-button">
        {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Download size={18} aria-hidden />}
        다운로드
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

/** 외부 링크 자료: 브라우저가 링크를 직접 열고(팝업 차단 없음), 열람 기록은 백그라운드로 남긴다 */
export function ExternalLinkButton({ resourceId, url }: { resourceId: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        void post(resourceId, 'download', true).catch(() => undefined)
      }}
      className={buttonClass}
      data-testid="external-link-button"
    >
      <ExternalLink size={18} aria-hidden />
      링크 열기
    </a>
  )
}
