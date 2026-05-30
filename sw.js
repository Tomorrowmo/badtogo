/* BadToGo Service Worker —— 离线优先的应用外壳缓存。
 * 策略：app shell 预缓存 + 缓存优先回退网络；换版本时清旧缓存。 */
const VERSION = 'badtogo-v1.4.0';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((res) => {
          // 同源成功响应顺手写入缓存，供下次离线使用
          if (res && res.ok && new URL(request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html')); // 离线兜底
    })
  );
});
