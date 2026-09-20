// AI4CEO 서비스 워커 — 목적은 하나: 인터넷이 끊겼을 때 빈 화면 대신 안내 페이지를 보여 준다.
// 로그인 상태의 화면·자료·API 응답은 저장하지 않는다(공용 기기에서 다른 사람 정보가 남지 않도록, 그리고 권한 변경이 바로 반영되도록).
// 그래서 페이지 이동(navigate) 요청이 네트워크 오류로 실패할 때만 개입하고, 나머지 요청은 브라우저 기본 동작에 맡긴다.
const CACHE = 'ai4ceo-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // redirect: 'error' — 어떤 이유로든 로그인 화면 등으로 리다이렉트되면 그 응답을 오프라인 페이지로 저장하지 않는다.
      .then((cache) => cache.add(new Request(OFFLINE_URL, { redirect: 'error' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ai4ceo-offline-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.mode !== 'navigate' || req.method !== 'GET') return
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())))
})
