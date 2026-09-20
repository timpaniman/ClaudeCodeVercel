import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI4CEO — 졸업생 포털',
  description: 'AI4CEO 졸업생을 위한 자료·공지 포털',
  manifest: '/manifest.json',
  icons: { icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'AI4CEO', statusBarStyle: 'black' },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
