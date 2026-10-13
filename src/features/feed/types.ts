import type { PostCardData } from '@/features/posts/types';

/**
 * Akış sekmeleri. Kapsam ikisinde de aynı (takip edilen kullanıcılar + takip edilen hisseleri
 * içeren gönderiler + görüntüleyenin kendi gönderileri); yalnızca sıralama değişir:
 * - `latest` ("En yeni"): `(createdAt, postId)` azalan, keyset.
 * - `popular` ("Popüler"): son `POPULAR_WINDOW_DAYS` gün, puan = beğeni + 2 × yorum, keyset
 *   `(score, createdAt, postId)` + anlık görüntü zamanı (`lib/db/score-cursor.ts`).
 */
export const FEED_TABS = ['latest', 'popular'] as const;
export type FeedTab = (typeof FEED_TABS)[number];

/** URL'deki sekme parametresi (K7: Türkçe). Varsayılan "En yeni" parametresizdir. */
export const FEED_TAB_PARAM = 'sekme';
export const FEED_TAB_SLUG = { latest: 'en-yeni', popular: 'populer' } as const satisfies Record<
  FeedTab,
  string
>;

export const FEED_PAGE_SIZE = 20;
export const POPULAR_WINDOW_DAYS = 7;
/** "N yeni gönderi" sayımının üst sınırı (bant "99+" gösterir; sayım tabloyu taramaz). */
export const NEW_POSTS_COUNT_CAP = 99;

export type FeedPage = {
  items: PostCardData[];
  /** Sonraki sayfanın opak imleci; son sayfada null. */
  nextCursor: string | null;
  /**
   * Yalnızca `latest` ilk sayfası: listedeki en yeni gönderinin imleci; "N yeni gönderi"
   * yoklaması bundan yenisini sayar. Boş listede ya da diğer sekmede null.
   */
  headCursor: string | null;
};

/**
 * Boş akışta hangi boş durum gösterilir: hiç kimseyi/hisseyi takip etmiyorsa keşfet önerisi,
 * takip ediyorsa "henüz paylaşım yok".
 */
export type FeedFollowSummary = { users: number; stocks: number };
