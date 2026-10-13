import { foldTag } from '@/lib/entities';

import type { ComposerServices, TagSuggestion, UserSuggestion } from '../types';

import { FIXTURE_FOLLOWED_TICKERS, FIXTURE_STOCKS, FIXTURE_TAGS, FIXTURE_USERS } from './fixtures';

const LIMIT = 6;

const wait = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });

/**
 * S7 sıralama kurallarının (ADR-0002 Karar 4) sahte karşılığı: kullanıcı adı tam > takip
 * edilen önek > diğer önek > görünen ad kelime başı. Oturumdaki kişiyi engelleyenler hariç.
 */
export const rankMockUsers = (query: string): UserSuggestion[] => {
  const visible = FIXTURE_USERS.filter(user => !user.blocksViewer);
  const strip = ({ blocksViewer: _b, ...user }: (typeof FIXTURE_USERS)[number]): UserSuggestion =>
    user;
  if (!query) return visible.filter(user => user.following).map(strip);
  const q = query.toLowerCase();
  const rank = (user: UserSuggestion): number | null => {
    if (user.username === q) return 0;
    if (user.username.startsWith(q)) return user.following ? 1 : 2;
    if (
      foldTag(user.displayName)
        .split(/\s+/)
        .some(word => word.startsWith(foldTag(q)))
    )
      return 3;
    return null;
  };
  return visible
    .map(user => ({ user, rank: rank(user) }))
    .filter(
      (entry): entry is { user: (typeof visible)[number]; rank: number } => entry.rank !== null
    )
    .sort((a, b) => a.rank - b.rank || a.user.username.localeCompare(b.user.username, 'tr'))
    .slice(0, LIMIT)
    .map(entry => strip(entry.user));
};

export const rankMockTags = (query: string): TagSuggestion[] => {
  const q = foldTag(query);
  const matches = q ? FIXTURE_TAGS.filter(tag => tag.slug.includes(q)) : FIXTURE_TAGS;
  return [...matches]
    .sort(
      (a, b) => Number(b.slug.startsWith(q)) - Number(a.slug.startsWith(q)) || b.count - a.count
    )
    .slice(0, LIMIT);
};

/** Geliştirme önizlemesi için ağsız servisler; `delayMs` yükleniyor durumunu görmeyi sağlar. */
export const createMockComposerServices = (delayMs = 120): ComposerServices => ({
  stockIndex: async signal => {
    await wait(0, signal);
    return FIXTURE_STOCKS;
  },
  defaultStocks: async signal => {
    await wait(0, signal);
    return { source: 'following', tickers: FIXTURE_FOLLOWED_TICKERS };
  },
  users: async (query, signal) => {
    await wait(delayMs, signal);
    return rankMockUsers(query);
  },
  tags: async (query, signal) => {
    await wait(delayMs, signal);
    return rankMockTags(query);
  },
  linkPreview: async (url, signal) => {
    await wait(delayMs * 3, signal);
    const host = new URL(url).hostname.replace(/^www\./, '');
    return {
      url,
      host,
      siteName: host,
      title: `${host} örnek önizleme başlığı`,
      description: 'Geliştirme önizlemesi için sahte açıklama metni.',
    };
  },
});
