import type { RichTextContent, StockLookup } from '@/components/rich-text';

export const SENTIMENTS = ['bullish', 'bearish', 'neutral'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

/** Kartın gördüğü yazar (PublicUser alt kümesi; e-posta/uid yok). */
export type PostAuthor = { username: string; displayName: string; avatarUrl: string | null };

/**
 * Link önizlemesi (ADR-0002 Karar 6, M1'de görselsiz). `pending`: gönderide önizlenebilir URL var
 * ama sunucu henüz çekmedi (`after()`); salt okunur kartta hiçbir şey render edilmez (istemci
 * yenilemesi olmadan iskelet sonsuza kadar kalırdı). `none`: kart yok (URL yok, kullanıcı kapattı,
 * çekme başarısız ya da başlık yok). Kart `toLinkPreviewDto` ile link-preview kartına eşlenir.
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
 * Girişli görüntüleyene özel durum (S10): beğeni butonu ve sahibine silme menüsü. Yoksa kart salt
 * okunurdur (anonim, önizleme). `isOwner` yalnızca UI içindir; yetki sunucuda kontrol edilir.
 */
export type PostViewerState = { liked: boolean; isOwner: boolean };

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
  viewer?: PostViewerState;
};
