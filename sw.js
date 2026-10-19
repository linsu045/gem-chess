/* 宝石棋离线缓存：页面网络优先（保证更新及时），音乐缓存优先（后台更新） */
const V = 'gemchess-v4';
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
    /* 绕过 HTTP 缓存取最新页面：GitHub Pages 给 HTML 设了 10 分钟缓存，
       否则刚更新的版本可能十分钟内都看不到 */
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(r => {
        if (r.ok) caches.open(V).then(c => c.put(SHELL, r.clone()));
        return r;
      }).catch(() =>
        caches.match(SHELL).then(hit => hit || new Response('离线且无缓存', { status: 503 }))
      )
    );
    return;
  }

  if (url.pathname.endsWith('/bgm.ogg')) {
    /* 命中整份缓存就直接给（播放器能处理 200 响应）；
       没命中就原样转发（保留 Range），缓存由页面在开播后后台补齐 */
    e.respondWith((async () => {
      const cache = await caches.open(V);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try { return await fetch(req); }
      catch (err) { return new Response('', { status: 504 }); }
    })());
    return;
  }
});
