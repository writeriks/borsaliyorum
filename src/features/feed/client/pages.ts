import type { InfiniteData } from '@tanstack/react-query';

import type { PostCardData } from '@/features/posts/types';

import type { FeedPage, FeedTab } from '../types';

/** `useInfiniteQuery` verisi: sayfalar + her sayfanın imleci (ilk sayfa `null`). */
export type FeedData = InfiniteData<FeedPage, string | null>;

export const feedQueryKey = (tab: FeedTab): readonly ['feed', FeedTab] => ['feed', tab];

export const initialFeedData = (page: FeedPage): FeedData => ({
  pages: [page],
  pageParams: [null],
});

/**
 * Sayfalardaki kartlar, tekrarsız. Keyset sayfalaması tekrar üretmez; yine de "yeni gönderi"
 * birleştirmesi ile sonradan yüklenen bir sayfa aynı kartı taşırsa (yarış) DOM'da çift `key` olmasın.
 */
export const flattenUnique = (data: FeedData): PostCardData[] => {
  const seen = new Set<number>();
  const items: PostCardData[] = [];
  for (const page of data.pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
};

/** Yalnızca ilk sayfa kalır: sonraki `refetch` tek istek atar ve en yeni sayfayı getirir. */
export const keepFirstPage = (data: FeedData): FeedData => ({
  pages: data.pages.slice(0, 1),
  pageParams: data.pageParams.slice(0, 1),
});

/**
 * Sunucudan taze ilk sayfa geldiğinde (composer sonrası `router.refresh`) — read-your-own-writes.
 * Tek sayfa yüklüyse olduğu gibi değiştirilir. Daha fazla sayfa yüklüyse kaydırma konumu
 * korunur: yalnızca mevcut baştan **daha yeni** ve listede olmayan kartlar başa eklenir ("En
 * yeni"); "Popüler"de sıra puana göre olduğundan çok sayfalı listeye dokunulmaz.
 */
export const mergeFreshFirstPage = (data: FeedData, fresh: FeedPage, tab: FeedTab): FeedData => {
  if (data.pages.length <= 1) return initialFeedData(fresh);
  if (tab !== 'latest') return data;
  const [first, ...rest] = data.pages;
  if (!first) return initialFeedData(fresh);
  const known = new Set(data.pages.flatMap(page => page.items.map(item => item.id)));
  const head = first.items[0];
  const newer = fresh.items.filter(
    item =>
      !known.has(item.id) &&
      (head === undefined ||
        item.createdAt > head.createdAt ||
        (item.createdAt === head.createdAt && item.id > head.id))
  );
  if (newer.length === 0) return data;
  return {
    pages: [{ ...first, items: [...newer, ...first.items], headCursor: fresh.headCursor }, ...rest],
    pageParams: data.pageParams,
  };
};

/** Silinen gönderi tüm sayfalardan çıkar (sahibinin silmesi; sayfa yenilemesi beklenmez). */
export const removePostFromPages = (data: FeedData, postId: number): FeedData => {
  if (!data.pages.some(page => page.items.some(item => item.id === postId))) return data;
  return {
    pages: data.pages.map(page => ({
      ...page,
      items: page.items.filter(item => item.id !== postId),
    })),
    pageParams: data.pageParams,
  };
};
