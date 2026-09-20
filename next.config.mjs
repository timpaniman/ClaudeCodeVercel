/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
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

export default nextConfig
