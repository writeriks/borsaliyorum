import type { z } from 'zod';

import {
  defaultStocksSchema,
  linkPreviewResponseSchema,
  stockIndexSchema,
  tagSuggestionsSchema,
  userSuggestionsSchema,
} from '../schemas';
import type { ComposerServices } from '../types';

export class ServiceResponseError extends Error {
  readonly status: number;

  constructor(path: string, status: number) {
    super(`${path} → ${status}`);
    this.name = 'ServiceResponseError';
    this.status = status;
  }
}

/** Sorgu metni `URLSearchParams` ile kodlanır; yol sabit. */
export const AUTOCOMPLETE_PATHS = {
  stocks: '/api/autocomplete/stocks',
  defaultStocks: '/api/autocomplete/stocks/default',
  users: '/api/autocomplete/users',
  tags: '/api/autocomplete/tags',
  linkPreview: '/api/link-preview',
} as const;

const getJson = async <T extends z.ZodType>(
  fetchImpl: typeof fetch,
  path: string,
  schema: T,
  signal: AbortSignal
): Promise<z.infer<T>> => {
  const response = await fetchImpl(path, {
    signal,
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new ServiceResponseError(path.split('?')[0] ?? path, response.status);
  return schema.parse(await response.json());
};

const withQuery = (path: string, params: Record<string, string>): string =>
  `${path}?${new URLSearchParams(params).toString()}`;

/**
 * S7 (autocomplete, `src/app/api/autocomplete/*`) ve S9 (link önizleme) uçlarının istemcisi;
 * production'da composer bununla çalışır (sahte servis yalnızca `/dev/composer`'da). Sözleşme
 * ADR-0002 Karar 4/6 + `types.ts`'teki ekler (`StockIndexItem.m`, `UserSuggestion.following`);
 * önizleme gövdesi S9'un `Result<{ preview }>` zarfıdır.
 */
export const createHttpComposerServices = (fetchImpl: typeof fetch = fetch): ComposerServices => ({
  stockIndex: signal => getJson(fetchImpl, AUTOCOMPLETE_PATHS.stocks, stockIndexSchema, signal),
  defaultStocks: signal =>
    getJson(fetchImpl, AUTOCOMPLETE_PATHS.defaultStocks, defaultStocksSchema, signal),
  users: (q, signal) =>
    getJson(fetchImpl, withQuery(AUTOCOMPLETE_PATHS.users, { q }), userSuggestionsSchema, signal),
  tags: (q, signal) =>
    getJson(fetchImpl, withQuery(AUTOCOMPLETE_PATHS.tags, { q }), tagSuggestionsSchema, signal),
  linkPreview: async (url, signal) => {
    const body = await getJson(
      fetchImpl,
      withQuery(AUTOCOMPLETE_PATHS.linkPreview, { url }),
      linkPreviewResponseSchema,
      signal
    );
    return body.data.preview;
  },
});
