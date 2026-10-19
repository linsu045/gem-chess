/* 宝石棋离线缓存：页面网络优先（保证更新及时），音乐缓存优先（后台更新） */
const V = 'gemchess-v1';
const SHELL = './';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V).then(c => c.addAll([SHELL])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        if (r.ok) caches.open(V).then(c => c.put(SHELL, r.clone()));
        return r;
      }).catch(() =>
        caches.match(SHELL).then(hit => hit || new Response('离线且无缓存', { status: 503 }))
      )
    );
    return;
  }

  if (url.pathname.endsWith('/bgm.ogg')) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(r => {
          if (r.ok) caches.open(V).then(c => c.put(req, r.clone()));
          return r;
        });
        return hit || net;
      })
    );
  }
});
