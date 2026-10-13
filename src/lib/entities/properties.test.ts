import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { foldTag } from './fold';
import { normalizeContent } from './normalize';
import { parseEntities } from './parse';
import { findActiveTrigger } from './trigger';

// Rastgele unicode metin, entity'lerin sık oluşması için tetikleyici ve sınır parçalarıyla karıştırılır.
const TOKENS = [
  '$',
  '#',
  '@',
  ' ',
  '\n',
  '(',
  ')',
  '.',
  ',',
  "'",
  '’',
  '“',
  '"',
  '/',
  '_',
  '-',
  'https://',
  'http://',
  'www.',
  '.com',
  'a.b',
  'user:pw@',
  'localhost',
  'THYAO',
  'thyao',
  'ŞİŞE',
  'İ',
  'ı',
  'ğ',
  '100',
  '😀',
  '👨\u200D👩\u200D👧',
  '\u0301',
  '\u202E',
  '\u2066',
  '\r\n',
  '\r',
  '\t',
  '\u0000',
  '\u200D',
  '\uD800',
];
const fragment = fc.oneof(
  fc.constantFrom(...TOKENS),
  fc.string({ unit: 'grapheme', maxLength: 4 })
);
const richText = fc.array(fragment, { maxLength: 60 }).map(parts => parts.join(''));
const anyText = fc.oneof(richText, fc.string({ unit: 'binary', maxLength: 200 }));

const RUNS = { numRuns: 2000 };

describe('parseEntities özellikleri', () => {
  it('(c) hiçbir girdide exception atmaz', () => {
    fc.assert(
      fc.property(anyText, text => {
        parseEntities(text);
      }),
      RUNS
    );
  });

  it('(a) entity’ler sıralı, çakışmasız ve metin sınırları içinde', () => {
    fc.assert(
      fc.property(anyText, text => {
        let previousEnd = 0;
        for (const entity of parseEntities(text)) {
          expect(entity.start).toBeGreaterThanOrEqual(previousEnd);
          expect(entity.end).toBeGreaterThan(entity.start);
          expect(entity.end).toBeLessThanOrEqual(text.length);
          previousEnd = entity.end;
        }
      }),
      RUNS
    );
  });

  it('(b) text.slice(start, end) her zaman tetikleyiciyle başlar', () => {
    fc.assert(
      fc.property(anyText, text => {
        for (const entity of parseEntities(text)) {
          const slice = text.slice(entity.start, entity.end);
          if (entity.type === 'cashtag') expect(slice.startsWith('$')).toBe(true);
          else if (entity.type === 'hashtag') expect(slice.startsWith('#')).toBe(true);
          else if (entity.type === 'mention') expect(slice.startsWith('@')).toBe(true);
          else expect(slice).toMatch(/^(?:https?:\/\/|www\.)/i);
        }
      }),
      RUNS
    );
  });

  it('kanonik değerler gramere uyar', () => {
    fc.assert(
      fc.property(anyText, text => {
        for (const entity of parseEntities(text)) {
          if (entity.type === 'cashtag') expect(entity.ticker).toMatch(/^[A-Z][A-Z0-9]{1,7}$/);
          if (entity.type === 'mention') expect(entity.username).toMatch(/^[a-z0-9_]{3,20}$/);
          if (entity.type === 'hashtag') expect(entity.slug).toBe(foldTag(entity.name));
        }
      }),
      RUNS
    );
  });

  it('bir entity’nin metni tek başına ayrıştırıldığında aynı entity’yi verir', () => {
    fc.assert(
      fc.property(anyText, text => {
        for (const entity of parseEntities(text)) {
          const alone = parseEntities(text.slice(entity.start, entity.end));
          expect(alone).toEqual([{ ...entity, start: 0, end: entity.end - entity.start }]);
        }
      }),
      RUNS
    );
  });
});

describe('normalizeContent özellikleri', () => {
  it('(d) idempotenttir', () => {
    fc.assert(
      fc.property(anyText, text => {
        const once = normalizeContent(text);
        expect(normalizeContent(once)).toBe(once);
      }),
      RUNS
    );
  });

  it('çıktıda grafem başına en fazla 4 birleştirici işaret vardır', () => {
    const segmenter = new Intl.Segmenter('tr', { granularity: 'grapheme' });
    const zalgo = fc
      .array(fc.oneof(anyText, fc.constantFrom('\u0301', '\u0316', '\u200D', 'a')), {
        maxLength: 60,
      })
      .map(parts => parts.join(''));
    fc.assert(
      fc.property(zalgo, text => {
        for (const { segment } of segmenter.segment(normalizeContent(text))) {
          expect(segment.match(/\p{M}/gu)?.length ?? 0).toBeLessThanOrEqual(4);
        }
      }),
      RUNS
    );
  });

  it('çıktıda CR, bidi, görünmez ayırıcı ve \\n/\\t dışı C0 yoktur', () => {
    fc.assert(
      fc.property(anyText, text => {
        expect(normalizeContent(text)).not.toMatch(
          /[\r\u0000-\u0008\u000B\u000C\u000E-\u001F\u00AD\u061C\u180E\u200B\u200C\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u{E0000}-\u{E007F}]/u
        );
      }),
      RUNS
    );
  });
});

describe('foldTag / findActiveTrigger özellikleri', () => {
  it('foldTag idempotenttir', () => {
    fc.assert(
      fc.property(anyText, text => {
        expect(foldTag(foldTag(text))).toBe(foldTag(text));
      }),
      RUNS
    );
  });

  it('findActiveTrigger throw etmez; bulunan tetikleyici metnin sonuna kadar uzanır', () => {
    fc.assert(
      fc.property(anyText, text => {
        const trigger = findActiveTrigger(text);
        if (trigger) {
          expect('$#@'.includes(text.charAt(trigger.start))).toBe(true);
          expect(text.slice(trigger.start + 1)).toBe(trigger.query);
        }
      }),
      RUNS
    );
  });
});
