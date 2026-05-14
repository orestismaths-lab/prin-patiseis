const CACHE = 'pp-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return

  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          caches.open(CACHE).then((c) => c.put(request, response.clone()))
        }
        return response
      })
      return cached || network
    })
  )
})
