'use client';

import { createContext, type ReactElement, type ReactNode, useContext, useMemo } from 'react';

/** Hover kartının ek verisi; ad/kod hisse indeksinden anında gelir, bunlar ağdan. */
export type StockCardStats = { mentions24h: number };

/**
 * Sayaç kaynağı. S7 (autocomplete/hisse uçları) gelene kadar sağlanmazsa sayaç satırı hiç
 * gösterilmez; geliştirme önizlemesi mock verir.
 */
export type StockStatsLoader = (ticker: string) => Promise<StockCardStats>;

/** Kartın gördüğü oturum durumu (S5'e kadar sayfalar `unknown` geçer; bkz. auth-session). */
export type StockCardViewer = 'unknown' | 'anonymous' | 'authenticated';

type StockCardContextValue = {
  viewer: StockCardViewer;
  /** Aynı hisse için kart her açıldığında yeniden istek atılmasın diye istek başına önbellek. */
  getStats: ((ticker: string) => Promise<StockCardStats>) | null;
};

const StockCardContext = createContext<StockCardContextValue>({
  viewer: 'unknown',
  getStats: null,
});

export const useStockCard = (): StockCardContextValue => useContext(StockCardContext);

type StockCardProviderProps = {
  loadStats?: StockStatsLoader;
  viewer?: StockCardViewer;
  children: ReactNode;
};

export const StockCardProvider = ({
  loadStats,
  viewer = 'unknown',
  children,
}: StockCardProviderProps): ReactElement => {
  const value = useMemo<StockCardContextValue>(() => {
    if (!loadStats) return { viewer, getStats: null };
    const cache = new Map<string, Promise<StockCardStats>>();
    const getStats = (ticker: string): Promise<StockCardStats> => {
      const cached = cache.get(ticker);
      if (cached) return cached;
      const pending = loadStats(ticker).catch((error: unknown) => {
        // Hata önbellekte kalmasın: kart bir sonraki açılışta yeniden denesin.
        cache.delete(ticker);
        throw error;
      });
      cache.set(ticker, pending);
      return pending;
    };
    return { viewer, getStats };
  }, [loadStats, viewer]);

  return <StockCardContext value={value}>{children}</StockCardContext>;
};
