// Design Ref: §3.3 activity_log.device — 통계의 모바일 vs PC 비율용. 서버(User-Agent)와 브라우저에서 같은 규칙을 쓴다.
export type DeviceKind = 'mobile' | 'desktop'

export function detectDevice(userAgent: string | null | undefined): DeviceKind {
  return userAgent && /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? 'mobile' : 'desktop'
}
