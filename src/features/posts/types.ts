import type { RichTextContent, StockLookup } from '@/components/rich-text';

export const SENTIMENTS = ['bullish', 'bearish', 'neutral'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

/** Kartın gördüğü yazar (PublicUser alt kümesi; e-posta/uid yok). */
export type PostAuthor = { username: string; displayName: string; avatarUrl: string | null };

/**
 * Link önizlemesi (ADR-0002 Karar 6, M1'de görselsiz). `pending`: gönderide önizlenebilir URL var
 * ama sunucu henüz çekmedi (`after()`); kart yerinde aynı ölçüde iskelet durur. `none`: kart yok
 * (URL yok, kullanıcı kapattı, çekme başarısız ya da başlık yok).
 */
export type PostLinkPreview =
  | { status: 'none' }
  | { status: 'pending' }
  | {
      status: 'ready';
      url: string;
      siteName: string | null;
      title: string | null;
      description: string | null;
    };

export type PostCounts = { likes: number; comments: number; reposts: number };

/**
 * `PostCard`'ın tek girdisi. Serileştirilebilir (istemci bileşenine de geçebilir): tarih ISO
 * metni, sözlükler düz nesne. Gövde `toRichTextContent` ile hazırlanır (eski format dahil).
 */
export type PostCardData = {
  id: number;
  author: PostAuthor;
  createdAt: string;
  body: RichTextContent;
  /** Gövdedeki cashtag'lerin hisse özeti. */
  stocks: StockLookup;
  sentiment: Sentiment;
  isSponsored: boolean;
  /** Eski uygulamadan gelen tek görsel (K10: v2'de yükleme yok). */
  mediaUrl: string | null;
  linkPreview: PostLinkPreview;
  counts: PostCounts;
};
