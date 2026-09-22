import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import { Inter } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister'

const inter = Inter({ subsets: ['latin'] })

// 제목·설명은 현재 언어(쿠키)에 따라 달라진다.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')
  return {
    title: t('title'),
    description: t('description'),
    manifest: '/manifest.json',
    icons: { icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/icons/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: 'Kevin Community', statusBarStyle: 'black' },
  }
}

// Next 14: themeColor/viewport 는 metadata 가 아니라 viewport export 로 둔다.
// 확대(pinch zoom)를 막지 않는다 — 40~60대 사용자의 가독성을 위해 (Design §5.4 접근성).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#6366f1',
  // 홈 화면 앱에서 하단 탭이 iPhone 홈 인디케이터를 침범하지 않도록 safe-area(env) 값을 쓰기 위해 필요
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 언어는 서버가 쿠키로 정하고, 같은 언어의 문구를 클라이언트 컴포넌트에도 내려준다 (하이드레이션 불일치 방지)
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className="dark">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
