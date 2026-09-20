'use client'

import { useEffect } from 'react'

// 운영 빌드에서만 등록한다(개발 서버의 핫리로드와 충돌하지 않도록). 실패해도 앱 동작에는 영향이 없다.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }, [])
  return null
}
