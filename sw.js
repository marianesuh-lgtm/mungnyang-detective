const CACHE_NAME = 'mungnyang-detective-v2.10';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // HTML(문서) 요청은 항상 네트워크 최신본을 우선 시도.
  // 게임 문항/로직이 담긴 핵심 파일이라 캐시가 오래된 버전을 붙들고 있으면 안 됨.
  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html') ||
    url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (isHTML) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req)) // 오프라인일 때만 캐시로 대체
    );
    return;
  }

  // 아이콘, 매니페스트 같은 정적 자산은 기존처럼 캐시 우선 (변경이 드물어 안전).
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((res) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, res.clone());
          return res;
        });
      }).catch(() => cached);
    })
  );
});
