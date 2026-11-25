const CACHE_PREFIXES_TO_REMOVE = ["awan-", "sepehr-offline-"]

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => CACHE_PREFIXES_TO_REMOVE.some((prefix) => key.startsWith(prefix)))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

// Navigation is intentionally not intercepted. This prevents a temporary API
// or container restart from replacing Sepehr Panel with a stale offline page.
