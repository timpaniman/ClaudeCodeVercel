'use client'

// Design Ref: §3.4 log_activity — 하루(KST) 1회 'visit' 을 남긴다. MAU 집계의 기준 이벤트.
// 브라우저에서는 localStorage 로 같은 날 중복 호출을 막고, DB 도 하루 1회만 기록한다(이중 방어).
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { detectDevice } from '@/lib/device'

const kstDate = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)

// 키에 사용자 ID 를 넣는다. 같은 브라우저를 여러 계정이 쓰면(공용 PC, 로그아웃 후 다른 계정 로그인)
// 먼저 기록한 계정 때문에 다른 계정의 접속이 누락되기 때문이다.
export function VisitLogger({ userId }: { userId: string }) {
  useEffect(() => {
    const key = `ai4ceo:visit:${userId}`
    const today = kstDate()
    try {
      if (localStorage.getItem(key) === today) return
    } catch {
      // 저장소를 못 쓰는 환경(사생활 보호 모드 등): DB 가 하루 1회로 걸러 준다
    }

    void createClient()
      .rpc('log_activity', { p_event: 'visit', p_device: detectDevice(navigator.userAgent) })
      .then(({ error }) => {
        if (error) return
        try {
          localStorage.setItem(key, today)
        } catch {
          /* 무시 */
        }
      })
  }, [userId])

  return null
}
