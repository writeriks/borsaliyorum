import { describe, expect, it } from 'vitest';

import { foldTag } from './fold';
import { normalizeContent } from './normalize';
import { parseEntities } from './parse';
import { summarize } from './test-utils';
import { findActiveTrigger } from './trigger';

const values = (text: string): string[] => summarize(text).map(e => `${e.type}:${e.value}`);

// S4 review/güvenlik bulgularının regresyon testleri (ADR-0002 "Review notları").
describe('G1 — hashtag homograf ve görünmez karakter taklidi', () => {
  it.each([
    ['#bist\u3164', 'bist'], // Hangul dolgu harfi (\p{L}) slug'a girmez
    ['#bist\u034F100', 'bist100'], // CGJ
    ['#bist100\uFE0F', 'bist100'], // varyasyon seçici
    ['#bist\u115F\u1160100', 'bist100'],
    ['#bist\u180B100', 'bist100'],
    ['#ＢＩＳＴ１００', 'bist100'], // NFKC tam genişlik
    ['#\u{1D401}IST100', 'bist100'], // NFKC matematiksel kalın B
  ])('%j → slug %j', (input, slug) => {
    expect(values(input)).toEqual([`hashtag:${slug}`]);
  });

  it('görünmez karakterler slug’ı gerçek etiketle aynı yapar, görünen ad korunur', () => {
    const [entity] = parseEntities('#bist\u034F100');
    expect(entity).toEqual({
      type: 'hashtag',
      start: 0,
      end: 9,
      slug: 'bist100',
      name: 'bist\u034F100',
    });
  });

  it.each([
    ['#\u3164\u3164'], // yalnızca görünmez dolgu → boş slug
    ['#\u115F'],
    ['#ВIST100'], // Kiril В + Latin
    ['#bistο'], // Latin + Yunan ο
    ['#́bist'], // birleştirici işaretle başlayan gövde (R3)
    ['#a\u037A'], // NFKC boşluk üretir
    [`#${'\uFDF2'.repeat(13)}`], // gövde 13 code point, NFKC slug'ı 52 → 50 sınırı aşılır
  ])('%j entity üretmez', input => {
    expect(parseEntities(input)).toEqual([]);
  });

  it('tek yazı sistemindeki Kiril/Yunan etiketler kabul edilir', () => {
    expect(values('#борса #αγορά')).toEqual(['hashtag:борса', 'hashtag:αγορά']);
  });

  it('foldTag görünmez karakterleri siler ve NFKC uygular', () => {
    expect(foldTag('bist\u3164')).toBe('bist');
    expect(foldTag('\u3164\u3164')).toBe('');
    expect(foldTag('ﬁnans')).toBe('finans');
    expect(foldTag('a\u200Db\u00ADc')).toBe('abc');
  });
});

describe('G2 — normalizeContent görünmez karakterleri siler', () => {
  it.each([
    ['$TH\u200BYAO', '$THYAO', 'cashtag:THYAO'],
    ['@ad\u2060min', '@admin', 'mention:admin'],
    ['#bi\u00ADst', '#bist', 'hashtag:bist'],
    ['\uFEFF$THYAO', '$THYAO', 'cashtag:THYAO'],
    ['$TH\u200CYAO', '$THYAO', 'cashtag:THYAO'],
    ['$TH\u200E\u200FYAO', '$THYAO', 'cashtag:THYAO'],
    ['$TH\u061CYAO', '$THYAO', 'cashtag:THYAO'],
    ['$TH\u2061\u2062\u2063\u2064YAO', '$THYAO', 'cashtag:THYAO'],
    ['$TH\u180EYAO', '$THYAO', 'cashtag:THYAO'],
    ['$TH\u{E0001}\u{E0041}\u{E007F}YAO', '$THYAO', 'cashtag:THYAO'],
  ])('%j → %j', (input, normalized, entity) => {
    expect(normalizeContent(input)).toBe(normalized);
    expect(values(normalizeContent(input))).toEqual([entity]);
  });

  it('ZWJ korunur', () => {
    expect(normalizeContent('a\u200Db')).toBe('a\u200Db');
  });
});

describe('G3 — URL href kanonik', () => {
  it.each([
    ['http://①②⑦.0.0.1/', 'http://127.0.0.1/'],
    ['http://０.０.０.０/', 'http://0.0.0.0/'],
    ['https://good.com\\@evil.com', 'https://good.com/@evil.com'],
    ['https://bücher.de/ğ', 'https://xn--bcher-kva.de/%C4%9F'],
    ['HTTPS://KAP.ORG.TR/x', 'https://kap.org.tr/x'],
  ])('%j → href %j, görünen metin yazıldığı gibi', (input, href) => {
    expect(summarize(input)).toEqual([{ type: 'url', text: input, value: href }]);
  });

  it.each([['www.$THYAO'], ['https://a_b.com'], ['https://-a.com'], ['https://a.com-/x']])(
    '%j geçersiz host: URL değil, içindeki tetikleyici de entity değil',
    input => {
      expect(parseEntities(input)).toEqual([]);
    }
  );

  it('kanonik biçimi 2048’i aşan URL kabul edilmez', () => {
    const prefix = 'https://a.com/';
    const text = prefix + 'ğ'.repeat(700); // ≤ 2048 code unit, kodlanınca ~4200
    expect(text.length).toBeLessThanOrEqual(2048);
    expect(parseEntities(text)).toEqual([]);
  });
});

describe('R2 — eksik kabul testleri', () => {
  it('[ENT-R06] javascript:alert(1) entity üretmez', () => {
    expect(parseEntities('javascript:alert(1)')).toEqual([]);
    expect(parseEntities('bkz javascript://x.com/%0aalert(1)')).toEqual([]);
  });

  it('[AC-04] foldTag şişe ile sise’yi eşler', () => {
    expect(foldTag('şişe')).toBe(foldTag('sise'));
  });
});

describe('R3 — NFD hashtag tetikleyicisi', () => {
  it('birleştirici işaretli sorgu tetikler', () => {
    expect(findActiveTrigger('#temettü')).toEqual({
      kind: 'hashtag',
      query: 'temettü',
      start: 0,
    });
  });

  it('işaretle başlayan sorgu tetiklemez', () => {
    expect(findActiveTrigger('#̈a')).toBeNull();
    expect(findActiveTrigger('#̈')).toBeNull();
  });

  it('NFD etiket NFC ile aynı slug’ı verir', () => {
    expect(values('#temettü')).toEqual(['hashtag:temettu']);
  });
});

describe('R4 — sol sınırı olmayan URL adayı da engellenir', () => {
  it.each([['x=https://x.com/(@ali)'], ['—https://x.com/@ali'], ['xwww.a.com/#etiket']])(
    '%j entity üretmez',
    input => {
      expect(parseEntities(input)).toEqual([]);
    }
  );

  it.each([['x=https://x.com/(@al'], ['—https://x.com/@al'], ['KAP:https://x.com/(@al']])(
    '%j tetikleyici açmaz',
    input => {
      expect(findActiveTrigger(input)).toBeNull();
    }
  );

  it('KAP:https://x.com/(@ali) → tek URL, mention yok', () => {
    expect(values('KAP:https://x.com/(@ali)')).toEqual(['url:https://x.com/(@ali)']);
  });

  it('engellenen adaydan önce başlayan entity korunur', () => {
    expect(values('$THYAOwww.x.com #bilgiwww.a.com')).toEqual([
      'cashtag:THYAOWWW',
      'hashtag:bilgiwww',
    ]);
  });
});

describe('R5 — kararlar', () => {
  it('`:` URL için sol sınırdır', () => {
    expect(summarize('Kaynak:https://kap.org.tr/x')).toEqual([
      { type: 'url', text: 'https://kap.org.tr/x', value: 'https://kap.org.tr/x' },
    ]);
  });

  it('`:` tetikleyiciler için sol sınır değildir', () => {
    expect(parseEntities('a:$THYAO b:#bist c:@ali')).toEqual([]);
    expect(findActiveTrigger('a:$th')).toBeNull();
  });

  it.each([
    ['kâr', 'kar'],
    ['KÂR', 'kar'],
    ['îmân', 'iman'],
    ['Ûmran', 'umran'],
  ])('foldTag şapkalı harfi katlar: %j → %j', (input, expected) => {
    expect(foldTag(input)).toBe(expected);
  });

  it('#kâr ile #kar aynı etiket', () => {
    expect(values('#kâr #kar')).toEqual(['hashtag:kar', 'hashtag:kar']);
  });
});
