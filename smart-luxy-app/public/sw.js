// ══════════════════════════════════════════════
//  SERVICE WORKER — Smart Luxy PWA
//  Cache des assets statiques pour mode offline
// ══════════════════════════════════════════════
const CACHE = 'smart-luxy-v1'

const STATIC = [
  '/',
  '/manifest.json',
]

// Installation — mise en cache des ressources statiques
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC))
  )
  self.skipWaiting()
})

// Activation — nettoyer les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — stratégie Network First (toujours frais si online)
self.addEventListener('fetch', e => {
  // Ignorer les requêtes Supabase et externes
  if (e.request.url.includes('supabase.co') ||
      e.request.url.includes('googleapis') ||
      e.request.url.includes('facebook') ||
      e.request.url.includes('telegram')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Mettre en cache les assets statiques
        if (e.request.destination === 'script' ||
            e.request.destination === 'style' ||
            e.request.destination === 'image') {
          const clone = res.clone()
          caches.open(CACHE).then(cache => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
