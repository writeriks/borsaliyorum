import { describe, expect, it } from 'vitest';

import type { PostCardData } from '@/features/posts/types';

import type { FeedPage } from '../types';

import {
  type FeedData,
  flattenUnique,
  initialFeedData,
  keepFirstPage,
  mergeFreshFirstPage,
  removePostFromPages,
} from './pages';

const post = (id: number, minute: number): PostCardData => ({
  id,
  author: { username: 'yazar', displayName: 'Yazar', avatarUrl: null },
  body: { text: `gönderi ${id}`, entities: [] },
  stocks: {},
  sentiment: 'neutral',
  isSponsored: false,
  mediaUrl: null,
  linkPreview: { status: 'none' },
  counts: { likes: 0, comments: 0, reposts: 0 },
  createdAt: new Date(Date.UTC(2026, 9, 10, 12, minute)).toISOString(),
});
const page = (items: PostCardData[], nextCursor: string | null = 'c'): FeedPage => ({
  items,
  nextCursor,
  headCursor: items[0] ? `h${items[0].id}` : null,
});
const ids = (data: FeedData): number[] => flattenUnique(data).map(item => item.id);

const twoPages = (): FeedData => ({
  pages: [page([post(5, 50), post(4, 40)]), page([post(3, 30), post(2, 20)], null)],
  pageParams: [null, 'c'],
});

describe('akış sayfa yardımcıları', () => {
  it('flattenUnique: sayfa sırası korunur, tekrar eden kart bir kez', () => {
    const data: FeedData = {
      pages: [page([post(3, 3), post(2, 2)]), page([post(2, 2), post(1, 1)])],
      pageParams: [null, 'c'],
    };
    expect(ids(data)).toEqual([3, 2, 1]);
  });

  it('keepFirstPage: yalnızca ilk sayfa ve imleci kalır', () => {
    const kept = keepFirstPage(twoPages());
    expect(kept.pages).toHaveLength(1);
    expect(kept.pageParams).toEqual([null]);
  });

  it('mergeFreshFirstPage: tek sayfa yüklüyse taze sayfa olduğu gibi gelir', () => {
    const fresh = page([post(9, 90), post(5, 50)]);
    expect(mergeFreshFirstPage(initialFeedData(page([post(5, 50)])), fresh, 'latest')).toEqual(
      initialFeedData(fresh)
    );
  });

  it('mergeFreshFirstPage: çok sayfada yalnızca baştan yeni ve bilinmeyenler başa eklenir (kaydırma korunur)', () => {
    // 9: yeni kendi gönderin; 1: listede olmayan eski kart (ör. yeni takip) → eklenmez
    const fresh = page([post(9, 90), post(5, 50), post(1, 10)]);
    const merged = mergeFreshFirstPage(twoPages(), fresh, 'latest');
    expect(ids(merged)).toEqual([9, 5, 4, 3, 2]);
    expect(merged.pages[0]?.headCursor).toBe('h9');
    expect(merged.pages).toHaveLength(2);
  });

  it('mergeFreshFirstPage: yeni kart yoksa aynı nesne; Popüler çok sayfada dokunulmaz', () => {
    const data = twoPages();
    expect(mergeFreshFirstPage(data, page([post(5, 50)]), 'latest')).toBe(data);
    expect(mergeFreshFirstPage(data, page([post(9, 90)]), 'popular')).toBe(data);
  });

  it('removePostFromPages: kart her sayfadan çıkar; yoksa aynı nesne', () => {
    const data = twoPages();
    expect(ids(removePostFromPages(data, 3))).toEqual([5, 4, 2]);
    expect(removePostFromPages(data, 42)).toBe(data);
  });
});
