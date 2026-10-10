import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { parseEntities } from '@/lib/entities';

import { buildSegments, type Segment } from './segments';
import type { RichTextEntity, StockLookup } from './types';

const STOCKS: StockLookup = {
  THYAO: { ticker: 'THYAO', companyName: 'Türk Hava Yolları A.O.', stockType: 'stock' },
  SISE: { ticker: 'SISE', companyName: 'Türkiye Şişe ve Cam Fabrikaları A.Ş.', stockType: 'stock' },
};

/** Parser çıktısını render girdisine çevirir (mention'lar yazıldığı adla, görünen adla). */
const entitiesOf = (text: string): RichTextEntity[] =>
  parseEntities(text).map((entity): RichTextEntity => {
    switch (entity.type) {
      case 'hashtag':
        return { type: 'hashtag', start: entity.start, end: entity.end, slug: entity.slug };
      case 'mention':
        return { ...entity, displayName: `Ad ${entity.username}` };
      default:
        return entity;
    }
  });

const joined = (segments: Segment[]): string => segments.map(segment => segment.text).join('');
const kinds = (segments: Segment[]): string[] => segments.map(segment => segment.kind);

describe('buildSegments', () => {
  it('tüm entity türlerini sırayla parçalar, düz metin aynen kalır', () => {
    const text = "$THYAO'nun #bist100'de @aysek ile https://www.kap.org.tr/tr/Bildirim/1.";
    const { segments, skipped } = buildSegments(text, entitiesOf(text), STOCKS);
    expect(skipped).toEqual([]);
    expect(joined(segments)).toBe(text);
    expect(kinds(segments)).toEqual([
      'cashtag',
      'text',
      'hashtag',
      'text',
      'mention',
      'text',
      'url',
      'text',
    ]);
    const url = segments.find(segment => segment.kind === 'url');
    expect(url).toMatchObject({
      href: 'https://www.kap.org.tr/tr/Bildirim/1',
      display: 'kap.org.tr/tr/Bildirim/1',
    });
  });

  it('URL sonundaki nokta metinde kalır, href kapsamaz ([URL-03])', () => {
    const text = 'bak https://x.com/a.';
    const { segments } = buildSegments(text, entitiesOf(text));
    expect(segments.at(-1)).toEqual({ kind: 'text', text: '.' });
    expect(segments.find(segment => segment.kind === 'url')).toMatchObject({
      href: 'https://x.com/a',
    });
  });

  it('indekste olmayan (listeden çıkmış) hisse düz metin; log nedeni değil', () => {
    const text = '$ZZZZ yükselir';
    const { segments, skipped } = buildSegments(
      text,
      [{ type: 'cashtag', start: 0, end: 5, ticker: 'ZZZZ' }],
      STOCKS
    );
    expect(segments).toEqual([{ kind: 'text', text }]);
    expect(skipped).toEqual([]);
  });

  it.each<[string, RichTextEntity]>([
    ['negatif başlangıç', { type: 'hashtag', start: -1, end: 4, slug: 'bist' }],
    ['metinden uzun', { type: 'hashtag', start: 0, end: 999, slug: 'bist' }],
    ['ters aralık', { type: 'hashtag', start: 4, end: 1, slug: 'bist' }],
    ['boş aralık', { type: 'hashtag', start: 0, end: 0, slug: 'bist' }],
    ['kesirli', { type: 'hashtag', start: 0.5, end: 3, slug: 'bist' }],
    ['NaN', { type: 'hashtag', start: Number.NaN, end: 3, slug: 'bist' }],
    ['Infinity', { type: 'hashtag', start: 0, end: Number.POSITIVE_INFINITY, slug: 'bist' }],
  ])('geçersiz offset (%s) atlanır, throw etmez', (_label, entity) => {
    const text = '#bist ve fazlası';
    const { segments, skipped } = buildSegments(text, [entity]);
    expect(segments).toEqual([{ kind: 'text', text }]);
    expect(skipped).toEqual([{ index: 0, type: 'hashtag', reason: 'offset' }]);
  });

  it('çakışan entity atlanır, ilki kalır', () => {
    const text = '$THYAO';
    const { segments, skipped } = buildSegments(
      text,
      [
        { type: 'cashtag', start: 0, end: 6, ticker: 'THYAO' },
        { type: 'cashtag', start: 2, end: 6, ticker: 'YAO' },
      ],
      STOCKS
    );
    expect(kinds(segments)).toEqual(['cashtag']);
    expect(skipped).toEqual([{ index: 1, type: 'cashtag', reason: 'overlap' }]);
  });

  it.each<[string, string, RichTextEntity]>([
    ['cashtag metni farklı kod', '$SISE', { type: 'cashtag', start: 0, end: 5, ticker: 'THYAO' }],
    ['cashtag tetikleyicisiz', 'THYAO', { type: 'cashtag', start: 0, end: 5, ticker: 'THYAO' }],
    ['ticker gramer dışı', '$th/x', { type: 'cashtag', start: 0, end: 5, ticker: 'TH/X' }],
    ['hashtag slug uyuşmuyor', '#bist100', { type: 'hashtag', start: 0, end: 8, slug: 'bist30' }],
    ['hashtag slug yol içeriyor', '#a/b', { type: 'hashtag', start: 0, end: 4, slug: 'a/b' }],
    [
      'mention tetikleyicisiz',
      'aysek',
      { type: 'mention', start: 0, end: 5, username: 'aysek', displayName: 'A' },
    ],
    [
      'mention adı kural dışı',
      '@ay/../x',
      { type: 'mention', start: 0, end: 8, username: 'ay/../x', displayName: 'A' },
    ],
  ])('metinle uyuşmayan entity (%s) düz metin', (_label, text, entity) => {
    const { segments, skipped } = buildSegments(text, [entity], STOCKS);
    expect(segments).toEqual([{ kind: 'text', text }]);
    expect(skipped[0]?.reason).toBe('mismatch');
  });

  describe('XSS: jsonb’ye sızmış href render edilmez', () => {
    it.each([
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
    ])('%s', href => {
      const text = `tıkla ${href} şimdi`;
      const start = text.indexOf(href);
      const { segments, skipped } = buildSegments(text, [
        { type: 'url', start, end: start + href.length, href },
      ]);
      expect(segments).toEqual([{ kind: 'text', text }]);
      expect(skipped).toEqual([{ index: 0, type: 'url', reason: 'unsafe-href' }]);
    });

    it('güvenli görünen metin + javascript: href → düz metin', () => {
      const text = 'https://kap.org.tr';
      const { segments } = buildSegments(text, [
        { type: 'url', start: 0, end: text.length, href: 'javascript:alert(1)' },
      ]);
      expect(segments).toEqual([{ kind: 'text', text }]);
    });

    it('görünen adres ile href farklıysa (kap.org.tr → evil.com) link olmaz', () => {
      const text = 'https://kap.org.tr/x';
      const { segments, skipped } = buildSegments(text, [
        { type: 'url', start: 0, end: text.length, href: 'https://evil.com/x' },
      ]);
      expect(segments).toEqual([{ kind: 'text', text }]);
      expect(skipped[0]?.reason).toBe('mismatch');
    });
  });

  it('homograf host punycode gösterilir', () => {
    const text = 'https://аpple.com/giris';
    const { segments } = buildSegments(text, entitiesOf(text));
    expect(segments).toEqual([
      {
        kind: 'url',
        text,
        href: 'https://xn--pple-43d.com/giris',
        display: 'xn--pple-43d.com/giris',
      },
    ]);
  });

  it('emoji (vekil çift) ortasında biten entity atlanır', () => {
    const text = '#a😀';
    // end = 3: 😀'nin yüksek vekili ile düşük vekili arasından kesiyor
    const { segments, skipped } = buildSegments(text, [
      { type: 'hashtag', start: 0, end: 3, slug: 'a' },
    ]);
    expect(segments).toEqual([{ kind: 'text', text }]);
    expect(skipped[0]?.reason).toBe('offset');
  });

  it('UTF-16 offset: emoji sonrası cashtag doğru konumda', () => {
    const text = '😀#emoji $SISE';
    const { segments } = buildSegments(text, entitiesOf(text), STOCKS);
    expect(segments.at(-1)).toMatchObject({ kind: 'cashtag', text: '$SISE' });
  });

  it('sırasız gelen entity’ler sıralanır', () => {
    const text = '#a #b';
    const { segments } = buildSegments(text, [
      { type: 'hashtag', start: 3, end: 5, slug: 'b' },
      { type: 'hashtag', start: 0, end: 2, slug: 'a' },
    ]);
    expect(kinds(segments)).toEqual(['hashtag', 'text', 'hashtag']);
  });

  it('özellik: rastgele entity listesiyle asla throw etmez ve metni kaybetmez', () => {
    const entity = fc.oneof(
      fc.record({
        type: fc.constant('cashtag' as const),
        start: fc.integer({ min: -3, max: 40 }),
        end: fc.integer({ min: -3, max: 40 }),
        ticker: fc.string(),
      }),
      fc.record({
        type: fc.constant('hashtag' as const),
        start: fc.integer({ min: -3, max: 40 }),
        end: fc.integer({ min: -3, max: 40 }),
        slug: fc.string(),
      }),
      fc.record({
        type: fc.constant('mention' as const),
        start: fc.integer({ min: -3, max: 40 }),
        end: fc.integer({ min: -3, max: 40 }),
        username: fc.string(),
        displayName: fc.string(),
      }),
      fc.record({
        type: fc.constant('url' as const),
        start: fc.integer({ min: -3, max: 40 }),
        end: fc.integer({ min: -3, max: 40 }),
        href: fc.oneof(fc.webUrl(), fc.string()),
      })
    );
    fc.assert(
      fc.property(
        fc.string({ maxLength: 40 }),
        fc.array(entity, { maxLength: 6 }),
        (text, list) => {
          const { segments } = buildSegments(text, list, STOCKS);
          expect(joined(segments)).toBe(text);
          for (const segment of segments) {
            if (segment.kind === 'url') expect(segment.href).toMatch(/^https?:\/\//);
          }
        }
      )
    );
  });

  it('özellik: parser çıktısı hiçbir zaman atlanmaz', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), text => {
        const { skipped } = buildSegments(text, entitiesOf(text), STOCKS);
        expect(skipped).toEqual([]);
      })
    );
  });
});
