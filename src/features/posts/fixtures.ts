import { type MentionUser, type StockSummary, toRichTextContent } from '@/components/rich-text';
import { type Entity, parseEntities, type StoredEntities } from '@/lib/entities';

import type { PostCardData } from './types';

/**
 * Sentetik gönderi verisi (docs/design/v2-composer-and-entities.md §0). DOM testleri ve
 * yalnızca geliştirme/test ortamındaki `/dev/post-card` önizlemesi kullanır; gerçek kişi yok.
 */
export const FIXTURE_STOCKS: Record<string, StockSummary> = {
  THYAO: { ticker: 'THYAO', companyName: 'Türk Hava Yolları A.O.', stockType: 'stock' },
  ASELS: {
    ticker: 'ASELS',
    companyName: 'Aselsan Elektronik Sanayi ve Ticaret A.Ş.',
    stockType: 'stock',
  },
  SISE: { ticker: 'SISE', companyName: 'Türkiye Şişe ve Cam Fabrikaları A.Ş.', stockType: 'stock' },
  BTC: { ticker: 'BTC', companyName: 'Bitcoin', stockType: 'crypto' },
};

export const FIXTURE_USERS: MentionUser[] = [
  { userId: 1, username: 'aysek', displayName: 'Ayşe Kaya' },
  { userId: 2, username: 'aysegul', displayName: 'Ayşegül Demir' },
  { userId: 3, username: 'mehmet_y', displayName: 'Mehmet Yılmaz' },
];

const TAG_IDS: Record<string, number> = { bist100: 10, bilanco: 11, temettu: 12 };
const STOCK_IDS: Record<string, number> = { THYAO: 100, ASELS: 101, SISE: 102, BTC: 103 };

/** Sunucunun yazma anında yaptığı çözümün (ADR-0002 Karar 7) sentetik karşılığı. */
export const storedEntitiesFor = (text: string): StoredEntities => {
  const items = parseEntities(text).flatMap((entity): Entity[] => {
    switch (entity.type) {
      case 'cashtag': {
        const stockId = STOCK_IDS[entity.ticker];
        return stockId === undefined ? [] : [{ ...entity, stockId }];
      }
      case 'hashtag': {
        const tagId = TAG_IDS[entity.slug] ?? 99;
        return [
          { type: 'hashtag', start: entity.start, end: entity.end, slug: entity.slug, tagId },
        ];
      }
      case 'mention': {
        const user = FIXTURE_USERS.find(candidate => candidate.username === entity.username);
        return user ? [{ ...entity, userId: user.userId }] : [];
      }
      default:
        return [entity];
    }
  });
  return { v: 1, items };
};

export const FIXTURE_NOW = '2026-10-10T11:35:00.000Z';

const base = (id: number, text: string, entities: unknown = storedEntitiesFor(text)) =>
  ({
    id,
    author: { username: 'aysek', displayName: 'Ayşe Kaya', avatarUrl: null },
    createdAt: '2026-10-10T11:32:00.000Z',
    body: toRichTextContent(
      { content: text, contentFormat: 2, entities },
      { users: FIXTURE_USERS }
    ),
    stocks: FIXTURE_STOCKS,
    sentiment: 'neutral',
    isSponsored: false,
    mediaUrl: null,
    linkPreview: { status: 'none' },
    counts: { likes: 48, comments: 12, reposts: 3 },
  }) satisfies PostCardData;

const ALL_ENTITIES_TEXT =
  "$THYAO bilanço sonrası marjlar #bist100'de konuşuluyor. @mehmet_y ne düşünüyor?\n" +
  'Kaynak: https://www.kap.org.tr/tr/Bildirim/1234567 ve ' +
  'https://www.borsaistanbul.com/tr/sayfa/2367/endeks-bilgileri?x=1';

/** Tüm entity türleri, bullish. */
export const POST_ALL_ENTITIES: PostCardData = {
  ...base(1, ALL_ENTITIES_TEXT),
  sentiment: 'bullish',
};

/** Sponsorlu, cashtag'siz (legal: sponsorlu gönderide cashtag yasak), link önizlemeli. */
export const POST_SPONSORED: PostCardData = {
  ...base(2, 'Yeni dönem eğitim programımız başladı, ayrıntılar: https://ornek.com/haber'),
  author: { username: 'mehmet_y', displayName: 'Mehmet Yılmaz', avatarUrl: null },
  isSponsored: true,
  linkPreview: {
    status: 'ready',
    url: 'https://ornek.com/haber',
    siteName: 'Örnek Haber',
    title: 'Borsa eğitim programı başladı',
    description: 'Yatırımcılar için temel analiz eğitimi bu hafta başlıyor.',
  },
  counts: { likes: 1234, comments: 0, reposts: 1 },
};

/** Eski format (contentFormat=1) markup'ı, bearish, önizleme bekleniyor. */
export const POST_LEGACY: PostCardData = {
  ...base(3, ''),
  body: toRichTextContent(
    {
      content: '$(THYAO) ve $(ASELS) için #(bist100) zayıf. @(aysegul) katılır mı? https://x.com/a',
      contentFormat: 1,
      entities: null,
    },
    { users: FIXTURE_USERS }
  ),
  sentiment: 'bearish',
  linkPreview: { status: 'pending' },
};

const HOSTILE_AUTHOR = { username: 'aysegul', displayName: 'Ayşegül Demir', avatarUrl: null };

const HOSTILE_TEXT =
  '<script>alert(1)</script> <img src=x onerror=alert(2)> javascript:alert(3) ' +
  'https://аpple.com/giris $THYAO @silinen_kullanici';

/** Kirli/düşmanca veri: script metni, jsonb'ye sızmış `javascript:` href'i, bozuk offset'ler. */
export const POST_HOSTILE: PostCardData = (() => {
  const text = HOSTILE_TEXT;
  const js = text.indexOf('javascript:');
  const homograph = text.indexOf('https://аpple.com/giris');
  const cashtag = text.indexOf('$THYAO');
  const mention = text.indexOf('@silinen_kullanici');
  const entities = {
    v: 1,
    items: [
      {
        type: 'url',
        start: js,
        end: js + 'javascript:alert(3)'.length,
        href: 'javascript:alert(3)',
      },
      { type: 'url', start: 0, end: 8, href: 'data:text/html,<script>alert(4)</script>' },
      {
        type: 'url',
        start: homograph,
        end: homograph + 'https://аpple.com/giris'.length,
        href: new URL('https://аpple.com/giris').href,
      },
      { type: 'cashtag', start: cashtag, end: cashtag + 6, ticker: 'THYAO', stockId: 100 },
      { type: 'cashtag', start: cashtag + 2, end: cashtag + 9, ticker: 'THYAO', stockId: 100 },
      { type: 'hashtag', start: -5, end: 9999, slug: 'bist100', tagId: 10 },
      {
        type: 'mention',
        start: mention,
        end: mention + 18,
        username: 'silinen_kullanici',
        userId: 404,
      },
      { type: 'bogus', start: 0, end: 1 },
    ],
  };
  return { ...base(4, text, entities), author: HOSTILE_AUTHOR };
})();

/** Eski uygulamanın Firebase Storage biçiminde, sentetik görsel adresi (E2E'de route ile karşılanır). */
export const FIXTURE_MEDIA_URL =
  'https://firebasestorage.googleapis.com/v0/b/ornek-bucket/o/grafik.png?alt=media';

/** Eski uygulamadan kalan görselli gönderi; görsel varken önizleme gösterilmez ([LPV-04]). */
export const POST_WITH_MEDIA: PostCardData = {
  ...base(5, 'Grafik ekte https://ornek.com/grafik'),
  mediaUrl: FIXTURE_MEDIA_URL,
  linkPreview: {
    status: 'ready',
    url: 'https://ornek.com/grafik',
    siteName: null,
    title: 'Görselli gönderide görünmemeli',
    description: null,
  },
};

const LONG_LINE = 'Uzun bir analiz satırı, gövde akışta altı satırla sınırlanır. ';
/** 6 satırı aşan gövde ("Devamını gör"). */
export const POST_LONG: PostCardData = base(
  6,
  Array.from({ length: 14 }, () => LONG_LINE).join('\n')
);

export const ALL_FIXTURE_POSTS: readonly PostCardData[] = [
  POST_ALL_ENTITIES,
  POST_SPONSORED,
  POST_LEGACY,
  POST_HOSTILE,
  POST_WITH_MEDIA,
  POST_LONG,
];
