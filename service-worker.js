// ONE TABLE Service Worker
// バージョン更新するたびにCACHE_NAMEを変更すること
const CACHE_NAME = 'one-table-v1.0.0';
const RUNTIME_CACHE = 'one-table-runtime';

// インストール時: 即時アクティブ化
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  self.skipWaiting();
});

// アクティブ化時: 古いキャッシュ削除
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Delete old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// fetch時: Network First戦略（常に最新を取りに行く）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // GAS APIへのリクエストはキャッシュしない（常に最新データ取得）
  if (url.hostname.includes('script.google.com')) {
    return;
  }
  
  // LIFF SDKやChart.jsなどの外部CDNはキャッシュしない
  if (url.hostname !== location.hostname) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功したらランタイムキャッシュに保存
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // ネットワーク失敗時のみキャッシュから返す
        return caches.match(event.request);
      })
  );
});

// メッセージ受信: 強制キャッシュクリア
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    }).then(() => {
      event.ports[0].postMessage({ status: 'cleared' });
    });
  }
});
