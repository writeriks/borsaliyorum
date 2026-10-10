import '@/app/globals.css';

import { act, cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import { TabBar } from '@/components/shell/tab-bar';

import tr from '../../../messages/tr.json';

import { Toaster } from './sonner';

// Router'sız ortamda next-intl navigasyonu yerine düz bağlantı; TabBar'ın ölçüsü değişmez
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }): ReactElement => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: (): string => '/akis',
}));

const Shell = (): ReactElement => (
  <NextIntlClientProvider locale='tr' messages={tr} timeZone='Europe/Istanbul'>
    <TabBar
      viewer={{
        status: 'authenticated',
        user: { username: 'ayse', displayName: 'Ayşe', avatarUrl: null },
      }}
      className='md:hidden'
    />
    <Toaster />
  </NextIntlClientProvider>
);

const showToastAt = async (width: number): Promise<{ toast: DOMRect; tabBar: DOMRect | null }> => {
  await page.viewport(width, 800);
  render(<Shell />);
  act(() => {
    toast('Gönderi paylaşıldı');
  });
  const toastEl = (await screen.findByText('Gönderi paylaşıldı')).closest('[data-sonner-toast]');
  if (!toastEl) throw new Error('toast öğesi bulunamadı');
  // Giriş animasyonu bitsin (transform), son konum ölçülsün
  await vi.waitFor(() => expect(toastEl.getAttribute('data-mounted')).toBe('true'));
  await new Promise(done => setTimeout(done, 500));

  const tabBarEl = screen.queryByTestId('tab-bar');
  const tabBarRect = tabBarEl?.getBoundingClientRect() ?? null;
  return {
    toast: toastEl.getBoundingClientRect(),
    tabBar: tabBarRect && tabBarRect.height > 0 ? tabBarRect : null,
  };
};

afterEach(() => {
  toast.dismiss();
  cleanup();
});

describe('Toaster konumu (gerçek tarayıcı + Tailwind)', () => {
  it.each([375, 650, 767])('%ipx: toast tab bar ile çakışmaz, 16px üstünde kalır', async width => {
    const { toast: toastRect, tabBar } = await showToastAt(width);
    expect(tabBar, 'md altında tab bar görünür olmalı').not.toBeNull();
    if (!tabBar) return;
    expect(toastRect.bottom).toBeLessThanOrEqual(tabBar.top - 16 + 1);
  });

  it('768px (md): tab bar yok, sonner varsayılanı 24px', async () => {
    const { toast: toastRect, tabBar } = await showToastAt(768);
    expect(tabBar).toBeNull();
    expect(Math.round(window.innerHeight - toastRect.bottom)).toBe(24);
  });
});
