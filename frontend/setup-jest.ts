import 'jest-preset-angular/setup-jest';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

// Mock service worker
Object.defineProperty(window, 'navigator', {
  value: {
    serviceWorker: {
      register: jest.fn(),
      ready: Promise.resolve({
        sync: {
          register: jest.fn()
        }
      })
    }
  },
  writable: true
});

// Mock IndexedDB
const indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDB,
  writable: true
});

// Mock Cache API
const caches = {
  open: jest.fn(),
  match: jest.fn(),
  has: jest.fn(),
  keys: jest.fn(),
  delete: jest.fn()
};

Object.defineProperty(window, 'caches', {
  value: caches,
  writable: true
});

// Mock Jasmine functions
global.jasmine = {
  createSpy: jest.fn,
  createSpyObj: (baseName: string, methodNames: string[]) => {
    const obj: any = {};
    for (const method of methodNames) {
      obj[method] = jest.fn();
    }
    return obj;
  }
};

global.spyOn = jest.spyOn;

// Mock Workbox modules
jest.mock('workbox-precaching', () => ({
  precacheAndRoute: jest.fn(),
  cleanupOutdatedCaches: jest.fn()
}), { virtual: true });

jest.mock('workbox-routing', () => ({
  registerRoute: jest.fn(),
  setCatchHandler: jest.fn()
}), { virtual: true });

jest.mock('workbox-strategies', () => ({
  NetworkFirst: jest.fn(() => ({
    handle: jest.fn()
  })),
  CacheFirst: jest.fn(() => ({
    handle: jest.fn()
  }))
}), { virtual: true });

jest.mock('workbox-expiration', () => ({
  ExpirationPlugin: jest.fn()
}), { virtual: true });

jest.mock('workbox-cacheable-response', () => ({
  CacheableResponsePlugin: jest.fn()
}), { virtual: true });

jest.mock('workbox-background-sync', () => ({
  BackgroundSyncPlugin: jest.fn()
}), { virtual: true });

// Add custom matchers
expect.extend({
  toBeTrue(received) {
    return {
      message: () => `expected ${received} to be true`,
      pass: received === true
    };
  },
  toBeFalse(received) {
    return {
      message: () => `expected ${received} to be false`,
      pass: received === false
    };
  }
});
  </rewritten_file>
  