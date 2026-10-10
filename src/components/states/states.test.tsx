import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { MESSAGES, renderWithIntl } from '../../../tests/utils/render';

import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';

const logError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ error: logError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }) },
}));

describe('EmptyState', () => {
  it('ikon (dekoratif) + tek cümle + aksiyon', () => {
    const { container } = renderWithIntl(
      <EmptyState
        icon={Inbox}
        message="Takip ettiğin hisse yok. Keşfet'e göz at."
        action={<a href='#kesfet'>Keşfet</a>}
      />
    );
    expect(screen.getByText("Takip ettiğin hisse yok. Keşfet'e göz at.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Keşfet' })).toHaveAttribute('href', '#kesfet');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('aksiyon opsiyoneldir', () => {
    renderWithIntl(<EmptyState icon={Inbox} message='Henüz bir şey yok.' />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it.each(['tr', 'en'] as const)(
    '%s: mesajı alert olarak duyurur, tekrar dene metni i18n',
    locale => {
      renderWithIntl(<ErrorState message='Akış yüklenemedi.' onRetry={() => undefined} />, locale);
      expect(screen.getByRole('alert')).toHaveTextContent('Akış yüklenemedi.');
      expect(
        screen.getByRole('button', { name: MESSAGES[locale].common.retry })
      ).toBeInTheDocument();
    }
  );

  it('tekrar deneme sürerken buton devre dışı + spinner, bitince yeniden etkin', async () => {
    const user = userEvent.setup();
    let resolve: () => void = () => undefined;
    const onRetry = (): Promise<void> =>
      new Promise<void>(done => {
        resolve = done;
      });

    renderWithIntl(<ErrorState message='Akış yüklenemedi.' onRetry={onRetry} />);
    const button = screen.getByRole('button', { name: 'Tekrar dene' });
    await user.click(button);
    expect(button).toBeDisabled();
    expect(screen.getByTestId('button-spinner')).toBeInTheDocument();

    resolve();
    await screen.findByRole('button', { name: 'Tekrar dene' });
    await expect.poll(() => button.hasAttribute('disabled')).toBe(false);
  });

  it('onRetry reject ederse unhandled rejection yok: loglanır, buton yeniden etkin', async () => {
    const user = userEvent.setup();
    const failure = new Error('ağ hatası');
    const unhandled = vi.fn();
    window.addEventListener('unhandledrejection', unhandled);
    process.on('unhandledRejection', unhandled);
    try {
      const onRetry = vi.fn(() => Promise.reject(failure));
      renderWithIntl(<ErrorState message='Akış yüklenemedi.' onRetry={onRetry} />);
      const button = screen.getByRole('button', { name: 'Tekrar dene' });

      await user.click(button);
      await expect.poll(() => button.hasAttribute('disabled')).toBe(false);
      expect(onRetry).toHaveBeenCalledOnce();
      expect(logError).toHaveBeenCalledWith('retry failed', { error: failure });
      expect(screen.queryByTestId('button-spinner')).not.toBeInTheDocument();

      // Yeniden denenebilir
      await user.click(button);
      expect(onRetry).toHaveBeenCalledTimes(2);
      await new Promise(done => setTimeout(done, 0));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('unhandledrejection', unhandled);
      process.off('unhandledRejection', unhandled);
    }
  });

  it('onRetry yoksa buton yok; inline (Partial) varyantında ikon yok', () => {
    const { container } = renderWithIntl(
      <ErrorState message='Daha fazlası yüklenemedi.' variant='inline' />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});
