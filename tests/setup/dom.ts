import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import type * as NextNavigation from 'next/navigation';
import { afterEach, vi } from 'vitest';

// Vitest globals kapalı olduğu için Testing Library otomatik temizlik yapmaz
afterEach(() => {
  cleanup();
  globalThis.__testPathname = undefined;
});

declare global {
  /** Testte aktif rota: `globalThis.__testPathname = '/akis'` (locale öneki dahil, ör. `/en/akis`) */
  var __testPathname: string | undefined;
}

vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  usePathname: (): string => globalThis.__testPathname ?? '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Radix (Dropdown, Tooltip) ve next-themes'in jsdom'da olmayan tarayıcı API'leri
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

if (typeof window !== 'undefined') {
  window.matchMedia ??= (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;

  Element.prototype.hasPointerCapture ??= (): boolean => false;
  Element.prototype.releasePointerCapture ??= (): void => undefined;
  Element.prototype.scrollIntoView ??= (): void => undefined;
}
