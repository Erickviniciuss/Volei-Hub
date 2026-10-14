const CACHE_NAME = 'volei-hub-cache-v2.1.1';
const CORE_ASSETS = [
  './',
  './index.html',
  './login.html',
  './jogo.html',
  './jogoajogo.html',
  './resultados.html',
  './GeradorTimes.html',
  './tabela.htm',
  './config.html',
  './acompanhar.html',
  './style.css',
  './manifest.json',
  './theme.js',
  './pwa.js',
  './assets/favicon.png',
  './assets/logo_escuro.png',
  './assets/logo_claro.png',
  './assets/casa.png',
  './assets/config.png',
  './assets/fundo.png',
  './assets/geradortime.png',
  './assets/jogoponto.png',
  './assets/jogorodada.png',
  './assets/resultados.png',
  './assets/tabela.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('Alguns assets não puderam ser cacheados na instalação:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Somente requisições GET e esquemas http/https
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Nunca cachear chamadas da API do Supabase ou CDN externas dinâmicas
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/auth/v1/')) {
    return;
  }

  // Navegações de página (HTML): Network first com fallback para cache
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Assets estáticos (CSS, JS, imagens): Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
