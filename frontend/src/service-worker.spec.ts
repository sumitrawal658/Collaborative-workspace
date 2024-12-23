/// <reference types="jest" />
/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';

interface MockFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mockResolvedValue: (value: any) => void;
  mockRejectedValue: (value: any) => void;
}

interface ExtendedCache extends Cache {
  put: jest.Mock;
  match: jest.Mock;
  delete: jest.Mock;
  keys: MockFunction<Cache['keys']>;
  addAll: jest.Mock;
  add: jest.Mock;
}

interface ExtendedCacheStorage extends CacheStorage {
  open: MockFunction<CacheStorage['open']>;
  match: jest.Mock;
  has: jest.Mock;
  keys: jest.Mock;
  delete: jest.Mock;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync: {
    register: jest.Mock;
  };
}

interface ExtendedServiceWorkerGlobalScope extends ServiceWorkerGlobalScope {
  caches: ExtendedCacheStorage;
  registration: ExtendedServiceWorkerRegistration;
  addEventListener: jest.Mock;
  skipWaiting: jest.Mock;
  clients: {
    claim: jest.Mock;
    matchAll: jest.Mock;
  };
}

interface ExtendedExtendableEvent extends ExtendableEvent {
  tag?: string;
  waitUntil: jest.Mock;
}

describe('Service Worker', () => {
  let sw: ExtendedServiceWorkerGlobalScope;
  let mockCache: ExtendedCache;
  let mockCaches: ExtendedCacheStorage;

  beforeEach(() => {
    // Mock Cache API
    mockCache = {
      put: jest.fn(),
      match: jest.fn(),
      delete: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      addAll: jest.fn(),
      add: jest.fn()
    } as unknown as ExtendedCache;

    mockCaches = {
      open: jest.fn().mockResolvedValue(mockCache),
      match: jest.fn(),
      has: jest.fn(),
      keys: jest.fn(),
      delete: jest.fn()
    } as unknown as ExtendedCacheStorage;

    // Mock Service Worker Global Scope
    sw = {
      caches: mockCaches,
      registration: {
        scope: 'http://localhost:4200/',
        sync: {
          register: jest.fn()
        }
      },
      addEventListener: jest.fn(),
      skipWaiting: jest.fn(),
      clients: {
        claim: jest.fn(),
        matchAll: jest.fn()
      }
    } as unknown as ExtendedServiceWorkerGlobalScope;

    // Mock Workbox functions
    jest.mock('workbox-precaching', () => ({
      precacheAndRoute: jest.fn()
    }));

    jest.mock('workbox-routing', () => ({
      registerRoute: jest.fn()
    }));

    jest.mock('workbox-strategies', () => ({
      NetworkFirst: jest.fn(),
      CacheFirst: jest.fn()
    }));
  });

  it('should precache static assets', () => {
    require('./service-worker');
    expect(precacheAndRoute).toHaveBeenCalled();
  });

  it('should register API route with NetworkFirst strategy', () => {
    require('./service-worker');
    expect(registerRoute).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(NetworkFirst)
    );
  });

  it('should register static assets route with CacheFirst strategy', () => {
    require('./service-worker');
    expect(registerRoute).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(CacheFirst)
    );
  });

  it('should handle sync events for offline changes', async () => {
    const { syncOfflineChanges } = require('./service-worker');
    const mockRequest = new Request('http://localhost:4200/api/notes/1');
    const mockResponse = new Response('{"id": "1"}');

    (mockCache.keys as MockFunction<Cache['keys']>).mockResolvedValue([mockRequest]);
    (global as any).fetch = jest.fn().mockResolvedValue(mockResponse);

    const syncEvent = new ExtendableEvent('sync') as ExtendedExtendableEvent;
    syncEvent.tag = 'offlineChangesSync';
    syncEvent.waitUntil = jest.fn();

    sw.dispatchEvent(syncEvent);

    await syncOfflineChanges();

    expect(mockCache.delete).toHaveBeenCalledWith(mockRequest);
  });

  it('should handle offline fallback for navigation requests', async () => {
    const { networkFirstWithOfflineFallback } = require('./service-worker');
    const mockRequest = new Request('http://localhost:4200/', {
      mode: 'navigate'
    });

    // Simulate network failure
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    // Mock offline.html in cache
    const mockOfflineHtml = new Response('Offline page');
    (mockCache.match as MockFunction<Cache['match']>).mockResolvedValue(mockOfflineHtml);

    const response = await networkFirstWithOfflineFallback.handle({
      request: mockRequest,
      event: new FetchEvent('fetch', { request: mockRequest })
    });

    expect(response).toBe(mockOfflineHtml);
  });

  it('should register background sync for offline changes', () => {
    require('./service-worker');
    const mockRequest = new Request('http://localhost:4200/api/notes/1', {
      method: 'POST'
    });

    sw.dispatchEvent(new FetchEvent('fetch', { request: mockRequest }));

    expect(sw.registration.sync.register).toHaveBeenCalledWith('offlineChangesSync');
  });
}); 