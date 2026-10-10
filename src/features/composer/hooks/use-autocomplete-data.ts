'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { TriggerKind } from '@/lib/entities';

import {
  createStockSearchIndex,
  resolveTickers,
  searchStocks,
  type StockSearchIndex,
} from '../lib/stock-search';
import type { ComposerServices, StockIndexItem, TagSuggestion, UserSuggestion } from '../types';

import { useDebouncedValue } from './use-browser';

/** Hisse indeksi tek istekle gelir, istemcide filtrelenir (ADR-0002 Karar 4). */
export const STOCK_INDEX_STALE_MS = 60 * 60 * 1000;
const REMOTE_DEBOUNCE_MS = 150;

export const composerQueryKeys = {
  stockIndex: ['composer', 'stocks', 'index'] as const,
  defaultStocks: ['composer', 'stocks', 'default'] as const,
  users: (q: string) => ['composer', 'users', q] as const,
  tags: (q: string) => ['composer', 'tags', q] as const,
  linkPreview: (url: string) => ['composer', 'link-preview', url] as const,
};

export type StockIndexState = {
  index: StockSearchIndex | null;
  followed: ReadonlySet<string>;
  isError: boolean;
};

export const useStockIndex = (
  services: ComposerServices
): StockIndexState & {
  defaultSource: 'following' | 'mostMentioned' | null;
  defaultTickers: readonly string[];
  isDefaultError: boolean;
  isPending: boolean;
  refetch: () => void;
} => {
  const indexQuery = useQuery({
    queryKey: composerQueryKeys.stockIndex,
    queryFn: ({ signal }) => services.stockIndex(signal),
    staleTime: STOCK_INDEX_STALE_MS,
    retry: false,
  });
  const defaultQuery = useQuery({
    queryKey: composerQueryKeys.defaultStocks,
    queryFn: ({ signal }) => services.defaultStocks(signal),
    staleTime: STOCK_INDEX_STALE_MS,
    retry: false,
  });
  const index = useMemo(
    () => (indexQuery.data ? createStockSearchIndex(indexQuery.data) : null),
    [indexQuery.data]
  );
  const defaultSource = defaultQuery.data?.source ?? null;
  const followed = useMemo(
    () => new Set(defaultSource === 'following' ? (defaultQuery.data?.tickers ?? []) : []),
    [defaultSource, defaultQuery.data]
  );
  return {
    index,
    followed,
    isError: indexQuery.isError,
    isPending: indexQuery.isPending,
    defaultSource,
    defaultTickers: defaultQuery.data?.tickers ?? [],
    isDefaultError: defaultQuery.isError,
    refetch: () => {
      void indexQuery.refetch();
      void defaultQuery.refetch();
    },
  };
};

export type AcOption =
  | { kind: 'cashtag'; key: string; value: string; stock: StockIndexItem }
  | { kind: 'hashtag'; key: string; value: string; tag: TagSuggestion }
  | { kind: 'mention'; key: string; value: string; user: UserSuggestion };

export type AcHeading =
  'stocks' | 'followedStocks' | 'mostMentioned' | 'tags' | 'trendingTags' | 'users' | 'following';

export type AcResult = {
  options: AcOption[];
  heading: AcHeading;
  /** İlk yükleme: gösterilecek veri yok. */
  isPending: boolean;
  /** Sorgu değişti, önceki sonuçlar gösteriliyor. */
  isRefreshing: boolean;
  isError: boolean;
  /** Boş durum metni için: varsayılan `$` listesi mi? */
  isDefaultEmpty: boolean;
  retry: () => void;
};

const toStockOption = (stock: StockIndexItem): AcOption => ({
  kind: 'cashtag',
  key: stock.t,
  value: stock.t,
  stock,
});

/**
 * Etkin token için öneriler. `$` yerel indeksten (ağ yok, debounce yok); `#` ve `@` sunucudan,
 * 150 ms debounce, eski istek `AbortSignal` ile iptal, `keepPreviousData` ile liste titremez.
 */
export const useAutocompleteData = (input: {
  services: ComposerServices;
  kind: TriggerKind | null;
  query: string;
  stocks: ReturnType<typeof useStockIndex>;
  /** Gelen kullanıcı adları: editörde "var olduğu bilinen" mention vurgusu için. */
  onUsersLoaded?: (users: readonly UserSuggestion[]) => void;
}): AcResult => {
  const { services, kind, query, stocks, onUsersLoaded } = input;
  // Boş sorgu (yalnızca tetikleyici) beklemeden; yazdıkça debounce
  const debounced = useDebouncedValue(query, query === '' ? 0 : REMOTE_DEBOUNCE_MS);
  const remoteQuery = query === '' ? '' : debounced;

  const users = useQuery({
    queryKey: composerQueryKeys.users(remoteQuery),
    queryFn: async ({ signal }) => {
      const result = await services.users(remoteQuery, signal);
      onUsersLoaded?.(result);
      return result;
    },
    enabled: kind === 'mention',
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
  const tags = useQuery({
    queryKey: composerQueryKeys.tags(remoteQuery),
    queryFn: ({ signal }) => services.tags(remoteQuery, signal),
    enabled: kind === 'hashtag',
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });

  return useMemo((): AcResult => {
    if (kind === 'cashtag') {
      const { index } = stocks;
      if (!index) {
        return {
          options: [],
          heading: 'stocks',
          isPending: !stocks.isError,
          isRefreshing: false,
          isError: stocks.isError,
          isDefaultEmpty: false,
          retry: stocks.refetch,
        };
      }
      if (query === '') {
        return {
          options: resolveTickers(index, stocks.defaultTickers).map(toStockOption),
          heading: stocks.defaultSource === 'mostMentioned' ? 'mostMentioned' : 'followedStocks',
          isPending: false,
          isRefreshing: false,
          isError: false,
          isDefaultEmpty: true,
          retry: stocks.refetch,
        };
      }
      return {
        options: searchStocks(index, query, stocks.followed).map(toStockOption),
        heading: 'stocks',
        isPending: false,
        isRefreshing: false,
        isError: false,
        isDefaultEmpty: false,
        retry: stocks.refetch,
      };
    }

    const remote = kind === 'mention' ? users : tags;
    const options: AcOption[] =
      kind === 'mention'
        ? (users.data ?? []).map(user => ({
            kind: 'mention',
            key: user.username,
            value: user.username,
            user,
          }))
        : (tags.data ?? []).map(tag => ({ kind: 'hashtag', key: tag.slug, value: tag.name, tag }));
    const heading: AcHeading =
      kind === 'mention'
        ? remoteQuery === ''
          ? 'following'
          : 'users'
        : remoteQuery === ''
          ? 'trendingTags'
          : 'tags';
    // Debounce beklerken de "yenileniyor" sayılır: önceki sonuçlar kalır
    const waiting = remoteQuery !== query;
    return {
      options: remote.isError ? [] : options,
      heading,
      isPending: !remote.isError && remote.data === undefined,
      isRefreshing: !remote.isError && (remote.isPlaceholderData || waiting),
      isError: remote.isError,
      isDefaultEmpty: false,
      retry: () => void remote.refetch(),
    };
  }, [kind, query, remoteQuery, stocks, users, tags]);
};
