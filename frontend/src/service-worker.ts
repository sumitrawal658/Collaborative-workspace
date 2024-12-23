/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  })
);

// Cache static assets
registerRoute(
  ({ request }) => request.destination === 'style' || 
                   request.destination === 'script' || 
                   request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  })
);

// Background sync for offline changes
const bgSyncPlugin = new BackgroundSyncPlugin('offlineChangesQueue', {
  maxRetentionTime: 24 * 60 // Retry for max of 24 Hours (specified in minutes)
});

// Register route for offline note changes
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/notes'),
  new NetworkFirst({
    cacheName: 'notes-cache',
    plugins: [
      bgSyncPlugin,
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  }),
  'POST'
);

// Handle offline fallback
const networkFirstWithOfflineFallback = new NetworkFirst({
  cacheName: 'offline-fallback',
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200]
    })
  ]
});

// Offline fallback for navigation requests
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async (args) => {
    try {
      return await networkFirstWithOfflineFallback.handle(args);
    } catch (error) {
      return caches.match('/offline.html');
    }
  }
);

// Listen for sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'offlineChangesSync') {
    event.waitUntil(syncOfflineChanges());
  }
});

async function syncOfflineChanges() {
  const cache = await caches.open('offline-changes');
  const keys = await cache.keys();
  
  return Promise.all(
    keys.map(async (request) => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
        return response;
      } catch (error) {
        console.error('Sync failed for request:', request.url, error);
        return error;
      }
    })
  );
} 