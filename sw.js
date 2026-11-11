// FactoryOS · Naturfarms — service worker
// - La app (index.html) se pide SIEMPRE a internet primero, así cada vez que subas una versión nueva se ve al momento.
//   Solo si no hay conexión se abre la última copia guardada.
// - Los datos (Supabase) nunca se guardan aquí: siempre van en directo.
const CACHE = 'factoryos-v1';
const BASICOS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;           // datos: siempre en directo
  // Páginas: primero internet, si falla la copia guardada
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  // Iconos, librerías y tipografías: copia guardada y se actualiza por detrás
  if (url.origin === location.origin || /cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(guardada => {
        const red = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const c2 = r.clone(); caches.open(CACHE).then(c => c.put(req, c2)); } return r; }).catch(() => guardada);
        return guardada || red;
      })
    );
  }
});
