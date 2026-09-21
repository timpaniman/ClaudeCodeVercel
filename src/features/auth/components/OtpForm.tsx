'use client'

// Design Ref: §5.4 /login — 이메일 → 인증 코드 입력. 비밀번호 없음.
// 코드 자릿수는 Supabase 프로젝트 설정(Authentication → Email OTP Length)을 따른다: NEXT_PUBLIC_OTP_LENGTH.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { mapAuthError, type AuthErrorKey } from '../authErrors'

const OTP_LENGTH = Number(process.env.NEXT_PUBLIC_OTP_LENGTH ?? 6)
const RESEND_SECONDS = 60
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 개인정보 수집·이용 동의 문구는 운영진이 확정해야 한다 (Design §12 #4). 확정되면 언어별 문구 파일의 auth.login.consentLabel / consentDetail 만 교체한다.

const inputClass =
  'w-full min-h-12 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors'
const primaryButton =
  'w-full min-h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2'

type FormError = AuthErrorKey | 'consentRequired'

export function OtpForm({ next }: { next: string }) {
  const t = useTranslations('auth')
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<FormError | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const verifying = useRef(false)

  const normalized = email.trim().toLowerCase()

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!EMAIL_RE.test(normalized)) return setError('emailInvalid')
    if (!consent) return setError('consentRequired')

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

  const errorBox = error && (
    <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
      {t(`errors.${error}`)}
    </div>
  )

  if (step === 'code') {
    return (
      <div className="space-y-5" data-testid="otp-step-code">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-white">{t('login.codeTitle')}</h2>
          <p className="text-sm text-gray-400 break-all">
            {t.rich('login.codeSent', {
              length: OTP_LENGTH,
              email: normalized,
              highlight: (chunks) => <span className="text-gray-200">{chunks}</span>,
            })}
          </p>
        </div>

        {errorBox}

        <div>
          <label htmlFor="otp" className="sr-only">
            {t('login.codeLabel')}
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
          {t('login.signIn')}
        </button>

        <p className="text-center text-xs text-gray-500">{t('login.linkHint')}</p>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setError(null)
            }}
            className="min-h-11 px-2 text-gray-400 hover:text-white"
          >
            {t('login.changeEmail')}
          </button>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={cooldown > 0 || busy}
            className="min-h-11 px-2 text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? t('login.resendIn', { seconds: cooldown }) : t('login.resend')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={sendCode} className="space-y-5" data-testid="otp-step-email">
      {errorBox}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
          {t('login.email')}
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
          <span>{t('login.consentLabel')}</span>
        </label>
        <p className="text-xs text-gray-500 pl-8">{t('login.consentDetail')}</p>
      </div>

      <button type="submit" disabled={busy} className={primaryButton}>
        {busy && <Loader2 size={18} className="animate-spin" />}
        {t('login.sendCode')}
      </button>

      {GOOGLE_ENABLED && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-500">
              <span className="bg-gray-950 px-3">{t('login.or')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={googleLogin}
            className="w-full min-h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-base font-medium py-3 rounded-xl transition-colors"
          >
            {t('login.google')}
          </button>
        </>
      )}
    </form>
  )
}
