import type { ErrorCode, ErrorMeta, Result } from '@/lib/errors';
import type { TriggerKind } from '@/lib/entities';

/** Gönderi duyarlılığı (Prisma `Sentiment` ile aynı değerler). */
export const SENTIMENTS = ['bullish', 'bearish', 'neutral'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export type ComposerMode = 'post' | 'comment';

/**
 * Kabuk varyantları (tasarım §1.1). `inline`: akış başı, boş ve odaksızken tek satır;
 * `dialog`: masaüstü "Gönderi paylaş"; `sheet`: mobil tam ekran, toolbar klavyenin üstünde.
 * Yorum composer'ı her zaman `inline` gibi davranır.
 */
export type ComposerLayout = 'inline' | 'dialog' | 'sheet';

// --- Autocomplete veri sözleşmesi (S7, ADR-0002 Karar 4) ---

export const STOCK_TYPES = ['stock', 'crypto', 'other'] as const;
export type StockType = (typeof STOCK_TYPES)[number];

/**
 * `GET /api/autocomplete/stocks` öğesi: tam hisse indeksi, istemcide filtrelenir.
 * `m`: son 7 gündeki gönderi sayısı (eşitlik bozucu, tasarım §2.2). ADR-0002'deki `{t, n, type}`
 * sözleşmesine S8'de eklendi; S7 vermezse 0 sayılır.
 */
export type StockIndexItem = { t: string; n: string; type: StockType; m?: number };

/** `GET /api/autocomplete/stocks/default`: boş `$` sorgusunun varsayılan listesi. */
export type DefaultStocks = { source: 'following' | 'mostMentioned'; tickers: string[] };

/** `GET /api/autocomplete/users?q=`: DTO'da e-posta/firebaseUid asla yok. */
export type UserSuggestion = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  following: boolean;
};

/** `GET /api/autocomplete/tags?q=`: `count` son 30 günlük kullanım. */
export type TagSuggestion = { slug: string; name: string; count: number };

/** `GET /api/link-preview?url=` (S9): yalnızca metin kartı (K6, M1'de görsel yok). */
export type LinkPreview = {
  url: string;
  host: string;
  siteName: string | null;
  title: string;
  description: string | null;
};

/**
 * Composer'ın dış dünyaya tek kapısı. Gerçek uygulamada HTTP (S7/S9 uçları), geliştirme
 * önizlemesinde bellek içi sahte veri. Her çağrı `AbortSignal` alır (eski istekler iptal).
 */
export type ComposerServices = {
  stockIndex: (signal: AbortSignal) => Promise<StockIndexItem[]>;
  defaultStocks: (signal: AbortSignal) => Promise<DefaultStocks>;
  users: (query: string, signal: AbortSignal) => Promise<UserSuggestion[]>;
  tags: (query: string, signal: AbortSignal) => Promise<TagSuggestion[]>;
  /** Önizleme yoksa ya da çekilemediyse `null` (sessizce kart yok). */
  linkPreview: (url: string, signal: AbortSignal) => Promise<LinkPreview | null>;
};

// --- Gönderme sözleşmesi (S10, ADR-0002 Karar 7) ---

export type PostSubmitInput = {
  text: string;
  sentiment: Sentiment;
  isSponsored: boolean;
  /** `null`: kullanıcı önizlemeyi kapattı ya da URL yok. */
  previewUrl: string | null;
  clientRequestId: string;
};

export type CommentSubmitInput = {
  postId: number;
  text: string;
  clientRequestId: string;
};

export type SubmitResult = Result<{ id: number }>;

export type PostSubmitHandler = (input: PostSubmitInput) => Promise<SubmitResult>;
export type CommentSubmitHandler = (input: CommentSubmitInput) => Promise<SubmitResult>;

/** Gönderme sonrası composer içinde gösterilen hata bandı türü. */
export type SubmitErrorKind =
  | { kind: 'generic' }
  | { kind: 'rateLimited' }
  | { kind: 'session' }
  | { kind: 'restricted' }
  /** E-posta doğrulanmamış: kullanıcı doğrulayıp tekrar paylaşabilir (sunucu Firebase'e yeniden sorar). */
  | { kind: 'unverified' }
  /** Aynı `clientRequestId` farklı yükle: otomatik yeniden deneme yok, sonraki gönderim yeni kimlik. */
  | { kind: 'conflict' }
  | { kind: 'validation'; code: ErrorCode; meta?: ErrorMeta };

export type { TriggerKind };
