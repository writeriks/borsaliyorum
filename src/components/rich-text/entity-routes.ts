import type { StockSummary } from './types';

/** K7 Türkçe rotalar. Segmentler encode edilir; entity değerleri zaten doğrulanmış olsa da. */
export const stockHref = (ticker: string): string => `/hisse/${encodeURIComponent(ticker)}`;
export const tagHref = (slug: string): string => `/etiket/${encodeURIComponent(slug)}`;
export const userHref = (username: string): string => `/u/${encodeURIComponent(username)}`;

export type ExternalStockLink = { kind: 'kap' | 'tradingview'; href: string };

/**
 * Hover kartındaki dış kaynaklar (v1 fiyatsız: yalnızca link). KAP şirket sayfası KAP'ın kendi
 * üye kimliğini istediği için hisse kodundan türetilemiyor; o veri gelene kadar BİST şirketleri
 * listesine gidilir. Kripto için KAP yok.
 */
export const externalStockLinks = (stock: StockSummary): ExternalStockLink[] => {
  const ticker = encodeURIComponent(stock.ticker);
  switch (stock.stockType) {
    case 'stock':
      return [
        { kind: 'kap', href: 'https://www.kap.org.tr/tr/bist-sirketler' },
        { kind: 'tradingview', href: `https://www.tradingview.com/symbols/BIST-${ticker}/` },
      ];
    case 'crypto':
      return [{ kind: 'tradingview', href: `https://www.tradingview.com/symbols/${ticker}USD/` }];
    default:
      return [];
  }
};

/** Dış link niteliği (ADR-0002 Karar 5, tasarım [ENT-R04]). */
export const UGC_LINK_REL = 'nofollow ugc noopener noreferrer';
/** Platformun kendi seçtiği dış kaynaklar (KAP, TradingView): kullanıcı içeriği değil. */
export const TRUSTED_LINK_REL = 'noopener noreferrer';
