'use client';

import { type ReactElement, type ReactNode, useCallback } from 'react';

import {
  type StockCardStats,
  type StockCardViewer,
  StockCardProvider,
} from '@/components/rich-text';

import type { StatsMode } from './modes';

// Sentetik sayaçlar (S7'deki gerçek uç gelene kadar).
const MOCK_MENTIONS: Readonly<Record<string, number>> = { THYAO: 214, ASELS: 132, SISE: 41 };

const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** Yalnızca `/dev/post-card`: hover kartı sayacını `?stats=ok|error|slow` ile taklit eder. */
export const DevStockCardProvider = ({
  stats,
  viewer,
  children,
}: {
  stats: StatsMode;
  viewer: StockCardViewer;
  children: ReactNode;
}): ReactElement => {
  const loadStats = useCallback(
    async (ticker: string): Promise<StockCardStats> => {
      await wait(stats === 'slow' ? 5_000 : 50);
      if (stats === 'error') throw new Error('mock stats error');
      return { mentions24h: MOCK_MENTIONS[ticker] ?? 0 };
    },
    [stats]
  );
  return (
    <StockCardProvider loadStats={loadStats} viewer={viewer}>
      {children}
    </StockCardProvider>
  );
};
