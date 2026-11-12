// Service worker: кэширует файлы приложения, чтобы FinFlow открывался без интернета.
// При изменении файлов увеличьте версию — старый кэш удалится при активации.
const CACHE = 'finflow-v2';

const APP_SHELL = [
  './',
  'index.html',
  'css/style.css',
  'js/main.js',
  'js/money.js',
  'js/dates.js',
  'js/stats.js',
  'js/csv.js',
  'js/i18n.js',
  'js/storage.js',
  'js/demo.js',
  'js/ui/dom.js',
  'js/ui/ring.js',
  'js/ui/chart.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Стратегия «сначала сеть, при ошибке — кэш»: онлайн всегда свежая версия, офлайн — сохранённая.
// Шрифты Google тоже кладём в кэш при первой загрузке.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const cacheable = url.origin === self.location.origin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com');
  if (!cacheable) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })
        .then((cached) => cached || (request.mode === 'navigate' ? caches.match('index.html') : undefined))),
  );
});
