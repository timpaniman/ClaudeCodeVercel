'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // 클립보드 권한이 없는 환경(http 등): 임시 textarea 로 대체
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-100"
      aria-live="polite"
    >
      {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      {copied ? '복사됨' : '코드 복사'}
    </button>
  )
}
