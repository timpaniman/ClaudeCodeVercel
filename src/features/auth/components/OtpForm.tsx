'use client'

// Design Ref: §5.4 /login — 이메일 → 인증 코드 입력. 비밀번호 없음.
// 코드 자릿수는 Supabase 프로젝트 설정(Authentication → Email OTP Length)을 따른다: NEXT_PUBLIC_OTP_LENGTH.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { mapAuthError } from '../authErrors'

const OTP_LENGTH = Number(process.env.NEXT_PUBLIC_OTP_LENGTH ?? 6)
const RESEND_SECONDS = 60
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 개인정보 수집·이용 동의 문구는 운영진이 확정해야 한다 (Design §12 #4). 확정되면 이 문구만 교체한다.
const PRIVACY_LABEL = '개인정보 수집·이용에 동의합니다. (필수)'
const PRIVACY_DETAIL =
  '수집 항목: 이메일, 이름, 회사·직책 등 프로필 정보 / 이용 목적: 졸업생 포털 제공, 자료·공지 알림 발송'

const inputClass =
  'w-full min-h-12 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors'
const primaryButton =
  'w-full min-h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2'

export function OtpForm({ next }: { next: string }) {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const verifying = useRef(false)

  const normalized = email.trim().toLowerCase()

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!EMAIL_RE.test(normalized)) return setError('이메일 주소를 확인해 주세요.')
    if (!consent) return setError('개인정보 수집·이용에 동의해 주세요.')

    setBusy(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: normalized,
      // consent 는 신규 가입 시 DB 트리거가 profiles.consented_at 으로 기록한다 (007_signup_consent.sql)
      // emailRedirectTo: 기본 메일 템플릿(코드 변수 없이 링크만 있는 경우)의 링크도 이 앱의 콜백으로 돌아와 로그인된다.
      options: { shouldCreateUser: true, data: { consent: true }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setBusy(false)
    if (err) return setError(mapAuthError(err, 'send'))

    setCode('')
    setStep('code')
    setCooldown(RESEND_SECONDS)
  }

  const verify = useCallback(
    async (token: string) => {
      if (verifying.current) return
      verifying.current = true
      setBusy(true)
      setError(null)
      const supabase = createClient()
      const { error: err } = await supabase.auth.verifyOtp({ email: normalized, token, type: 'email' })
      if (err) {
        setError(mapAuthError(err, 'verify'))
        setCode('')
        setBusy(false)
        verifying.current = false
        return
      }
      router.replace(next)
      router.refresh()
    },
    [normalized, next, router],
  )

  // 코드가 다 채워지면 자동 제출
  useEffect(() => {
    if (step === 'code' && code.length === OTP_LENGTH) void verify(code)
  }, [code, step, verify])

  const googleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
  }

  if (step === 'code') {
    return (
      <div className="space-y-5" data-testid="otp-step-code">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-white">인증 코드를 입력해 주세요</h2>
          <p className="text-sm text-gray-400 break-all">
            <span className="text-gray-200">{normalized}</span> 로 {OTP_LENGTH}자리 코드를 보냈습니다.
          </p>
        </div>

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="otp" className="sr-only">
            인증 코드
          </label>
          <input
            id="otp"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            autoFocus
            disabled={busy}
            placeholder={'0'.repeat(OTP_LENGTH)}
            className={`${inputClass} text-center text-2xl tracking-[0.35em] font-semibold`}
          />
        </div>

        <button type="button" onClick={() => verify(code)} disabled={busy || code.length !== OTP_LENGTH} className={primaryButton}>
          {busy && <Loader2 size={18} className="animate-spin" />}
          로그인
        </button>

        <p className="text-center text-xs text-gray-500">메일의 “로그인” 버튼을 눌러도 로그인됩니다.</p>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setError(null)
            }}
            className="min-h-11 px-2 text-gray-400 hover:text-white"
          >
            이메일 다시 입력
          </button>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={cooldown > 0 || busy}
            className="min-h-11 px-2 text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `코드 다시 받기 (${cooldown}초)` : '코드 다시 받기'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={sendCode} className="space-y-5" data-testid="otp-step-email">
      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
          이메일
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          autoComplete="email"
          inputMode="email"
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-3 text-base text-gray-200 cursor-pointer min-h-11">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="h-5 w-5 shrink-0 rounded border-white/20 bg-white/5 accent-indigo-500"
          />
          <span>{PRIVACY_LABEL}</span>
        </label>
        <p className="text-xs text-gray-500 pl-8">{PRIVACY_DETAIL}</p>
      </div>

      <button type="submit" disabled={busy} className={primaryButton}>
        {busy && <Loader2 size={18} className="animate-spin" />}
        인증 코드 보내기
      </button>

      {GOOGLE_ENABLED && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-500">
              <span className="bg-gray-950 px-3">또는</span>
            </div>
          </div>
          <button
            type="button"
            onClick={googleLogin}
            className="w-full min-h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-base font-medium py-3 rounded-xl transition-colors"
          >
            Google로 계속하기
          </button>
        </>
      )}
    </form>
  )
}
