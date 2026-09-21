import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      // 스크립트 출처는 제한하지 않는다(Next 인라인 스크립트와 충돌). 다른 사이트가 이 사이트를 프레임에 넣거나 <base>·<form>·<object> 로 악용하는 것만 막는다.
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
    ]
    return [
      { source: '/:path*', headers: security },
      {
        // 서비스 워커는 브라우저/CDN 이 오래 캐시하지 않게 해서, 수정본이 곧바로 반영되도록 한다.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
