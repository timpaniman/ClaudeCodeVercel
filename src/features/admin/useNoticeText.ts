'use client'

import { useTranslations } from 'next-intl'
import { noticeOf, type NotificationResult, type PublishFailure } from './publishClient'

/** 알림 결과와 발행 실패를 현재 언어의 문구로 바꾸는 훅 (관리자 목록·폼 공용) */
export function useNoticeText() {
  const t = useTranslations()
  return {
    /** 알림 결과 문구. 알림을 요청하지 않았으면 null */
    notice(n: NotificationResult | null): string | null {
      const d = n ? noticeOf(n) : null
      return d ? t(`admin.notice.${d.key}`, { sent: d.sent, failed: d.failed }) : null
    },
    /** 발행 실패 문구 */
    failure(f: PublishFailure): string {
      return f === 'network' ? t('admin.notice.network') : t(`apiErrors.${f}`)
    },
  }
}
