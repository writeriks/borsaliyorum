import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MESSAGES, renderWithIntl } from '../../../tests/utils/render';

import { CashtagLink } from './cashtag-link';
import { type StockCardStats, type StockCardViewer, StockCardProvider } from './stock-card-context';
import type { StockSummary } from './types';

const THYAO: StockSummary = {
  ticker: 'THYAO',
  companyName: 'Türk Hava Yolları A.O.',
  stockType: 'stock',
};

const stubPointer = (fine: boolean): void => {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: fine,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList
  );
};

const renderCard = (
  options: {
    viewer?: StockCardViewer;
    loadStats?: (ticker: string) => Promise<StockCardStats>;
    stock?: StockSummary;
  } = {}
): ReturnType<typeof renderWithIntl> => {
  const Wrapper = (): ReactElement => (
    <StockCardProvider loadStats={options.loadStats} viewer={options.viewer}>
      <p>
        <CashtagLink text='$THYAO' stock={options.stock ?? THYAO} />
      </p>
    </StockCardProvider>
  );
  return renderWithIntl(<Wrapper />);
};

const hoverAndFindCard = async (): Promise<HTMLElement> => {
  const user = userEvent.setup();
  await user.hover(screen.getByRole('link', { name: '$THYAO, Türk Hava Yolları A.O.' }));
  return screen.findByTestId('stock-hover-card', {}, { timeout: 2000 });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CashtagLink hover kartı', () => {
  it('fareli cihazda: şirket adı, KAP, TradingView, kısa uyarı; fiyat yok ([HC-01/03/04/06])', async () => {
    stubPointer(true);
    renderCard({ loadStats: async () => ({ mentions24h: 214 }) });
    const card = await hoverAndFindCard();

    expect(card).toHaveTextContent('Türk Hava Yolları A.O.');
    expect(card).toHaveTextContent('BIST · Pay');
    expect(card).toHaveTextContent(MESSAGES.tr.legal.disclaimer.short);
    for (const name of [/^KAP/, /^TradingView/]) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('rel')).toContain('noreferrer');
    }
    expect(screen.getByRole('link', { name: /^TradingView/ })).toHaveAttribute(
      'href',
      'https://www.tradingview.com/symbols/BIST-THYAO/'
    );
    expect(screen.getByRole('link', { name: 'Hisse sayfası' })).toHaveAttribute(
      'href',
      '/hisse/THYAO'
    );
    expect(await screen.findByText('Son 24 saatte 214 gönderi')).toBeInTheDocument();
    expect(card.textContent).not.toMatch(/₺|%\d/);
  });

  it('auth bilinmiyorken "Takip et" yok, skeleton var ([HC-05])', async () => {
    stubPointer(true);
    renderCard();
    await hoverAndFindCard();
    expect(screen.getByTestId('follow-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Takip et')).toBeNull();
  });

  it('anonim kullanıcıya "Takip et" girişe götürür', async () => {
    stubPointer(true);
    renderCard({ viewer: 'anonymous' });
    await hoverAndFindCard();
    expect(screen.getByRole('link', { name: 'Takip et' })).toHaveAttribute('href', '/giris');
  });

  it('sayaç hatası kartı bozmaz, sayaç satırı gizlenir ([HC-07])', async () => {
    stubPointer(true);
    const loadStats = vi.fn(async (): Promise<StockCardStats> => {
      throw new Error('500');
    });
    renderCard({ loadStats });
    const card = await hoverAndFindCard();
    await waitFor(() => expect(loadStats).toHaveBeenCalledWith('THYAO'));
    // Yükleniyor satırı kaybolur ve yerine sayaç gelmez
    await waitFor(() => expect(screen.queryByText(MESSAGES.tr.hovercard.statsLoading)).toBeNull());
    expect(card).not.toHaveTextContent('Son 24 saatte');
    expect(card).toHaveTextContent('Türk Hava Yolları A.O.');
  });

  it('sayaç yükleyicisi yoksa (S7 öncesi) satır hiç yok', async () => {
    stubPointer(true);
    renderCard();
    const card = await hoverAndFindCard();
    expect(card).not.toHaveTextContent('Son 24 saatte');
    expect(screen.queryByText(MESSAGES.tr.hovercard.statsLoading)).toBeNull();
  });

  it('kripto: KAP linki yok', async () => {
    stubPointer(true);
    renderCard({
      stock: { ticker: 'THYAO', companyName: 'Türk Hava Yolları A.O.', stockType: 'crypto' },
    });
    await hoverAndFindCard();
    expect(screen.queryByRole('link', { name: /^KAP/ })).toBeNull();
    expect(screen.getByRole('link', { name: /^TradingView/ })).toBeInTheDocument();
  });

  it('dokunmatik/kaba işaretçide kart hiç açılmaz ([HC-02])', async () => {
    stubPointer(false);
    renderCard();
    const user = userEvent.setup();
    await user.hover(screen.getByRole('link', { name: '$THYAO, Türk Hava Yolları A.O.' }));
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(screen.queryByTestId('stock-hover-card')).toBeNull();
  });
});
