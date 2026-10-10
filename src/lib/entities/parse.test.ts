import { describe, expect, it } from 'vitest';

import { firstPreviewableUrl, parseEntities } from './parse';
import { summarize } from './test-utils';

const values = (text: string): string[] => summarize(text).map(e => `${e.type}:${e.value}`);

describe('parseEntities — cashtag', () => {
  it.each([
    ['$AB', ['cashtag:AB']],
    ['$ABCDEFGH', ['cashtag:ABCDEFGH']],
    ['$A', []],
    ['$ABCDEFGHI', []],
    ['$5K', []],
    ['$', []],
    ['$ ', []],
    ['$THYAOş', []],
    ['$THYAO_', []],
    ['$THYAO\u0301', []],
    ['$THYAO.IS', ['cashtag:THYAO']],
    ['($THYAO)', ['cashtag:THYAO']],
    ['[$THYAO] {$ASELS}', ['cashtag:THYAO', 'cashtag:ASELS']],
    [
      '"$THYAO" \'$ASELS\' “$SISE” ‘$KCHOL’',
      ['cashtag:THYAO', 'cashtag:ASELS', 'cashtag:SISE', 'cashtag:KCHOL'],
    ],
    ['a\n$THYAO\t$ASELS', ['cashtag:THYAO', 'cashtag:ASELS']],
    ['$$THYAO', []],
    ['$thyao-$asels', ['cashtag:THYAO']],
    ['$sise', ['cashtag:SISE']],
  ])('%j', (input, expected) => {
    expect(values(input)).toEqual(expected);
  });
});

describe('parseEntities — hashtag', () => {
  it.each([
    ['#a', ['hashtag:a']],
    ['#bist_100', ['hashtag:bist_100']],
    ['#2026hedef', ['hashtag:2026hedef']],
    ['#_', []],
    ['#', []],
    ['##bist', []],
    [`#${'a'.repeat(50)}`, [`hashtag:${'a'.repeat(50)}`]],
    [`#${'a'.repeat(51)}`, []],
    ['#temettü,#bilanço', ['hashtag:temettu']],
    ['#BIST100 #bist100 #BİST100', ['hashtag:bist100', 'hashtag:bist100', 'hashtag:bist100']],
    ['site.com/#bolum', []],
    ['#ali@veli', ['hashtag:ali']],
  ])('%j', (input, expected) => {
    expect(values(input)).toEqual(expected);
  });

  it('görünen adı yazıldığı gibi korur, slug katlanır', () => {
    expect(parseEntities('#BİST100')).toEqual([
      { type: 'hashtag', start: 0, end: 8, slug: 'bist100', name: 'BİST100' },
    ]);
  });

  it('50 sınırını code point ile sayar (BMP dışı harf 2 code unit)', () => {
    const astralLetter = '𝐀'; // U+1D400, \p{L}
    const body = astralLetter.repeat(50);
    expect(parseEntities(`#${body}`)).toHaveLength(1);
    expect(parseEntities(`#${body}a`)).toHaveLength(0);
  });
});

describe('parseEntities — mention', () => {
  it.each([
    ['@abc', ['mention:abc']],
    [`@${'a'.repeat(20)}`, [`mention:${'a'.repeat(20)}`]],
    [`@${'a'.repeat(21)}`, []],
    ['@Ali_Veli', ['mention:ali_veli']],
    ['@ali@x', []],
    ['@ali.veli', []],
    ['@ali.5', ['mention:ali']],
    ['@ali.', ['mention:ali']],
    ['@ali-veli', ['mention:ali']],
    ['@ali, @veli!', ['mention:ali', 'mention:veli']],
    ['@aliş', []],
  ])('%j', (input, expected) => {
    expect(values(input)).toEqual(expected);
  });
});

describe('parseEntities — url', () => {
  it.each([
    ['https://kap.org.tr', ['url:https://kap.org.tr']],
    ['HTTPS://KAP.ORG.TR/x', ['url:HTTPS://KAP.ORG.TR/x']],
    ['WWW.kap.org.tr', ['url:https://WWW.kap.org.tr']],
    ['http://a.b/c?d=1&e=2#f', ['url:http://a.b/c?d=1&e=2#f']],
    [
      'https://tr.wikipedia.org/wiki/Borsa_(ekonomi)',
      ['url:https://tr.wikipedia.org/wiki/Borsa_(ekonomi)'],
    ],
    ['(https://a.com/x_(y))', ['url:https://a.com/x_(y)']],
    ['https://a.com/x?!.,:;', ['url:https://a.com/x']],
    ['“https://a.com”', ['url:https://a.com']],
    ['"https://a.com"', ['url:https://a.com']],
    ['<https://a.com>', []],
    ['https://a.com’dan', ['url:https://a.com']],
    ['kap.org.tr', []],
    ['A.Ş. THYAO.IS', []],
    ['xhttps://a.com', []],
    ['https://', []],
    ['www.', []],
    ['https://a..com', []],
    ['https://user@a.com', []],
    ['https://:pw@a.com', []],
    ['https://[::1]/x', []],
    ['https://a.com:99999', []],
    ['https://a.com/ https://b.com', ['url:https://a.com/', 'url:https://b.com']],
    ['https://a.com/@ali/$THYAO', ['url:https://a.com/@ali/$THYAO']],
  ])('%j', (input, expected) => {
    expect(values(input)).toEqual(expected);
  });

  it('2048 karakterlik URL kabul edilir, daha uzunu edilmez', () => {
    const prefix = 'https://a.com/';
    const ok = prefix + 'x'.repeat(2048 - prefix.length);
    expect(values(ok)).toEqual([`url:${ok}`]);
    expect(values(`${ok}x`)).toEqual([]);
  });

  it('reddedilen URL adayının içindeki tetikleyiciler de entity olmaz', () => {
    expect(values('http://user:pw@evil.com/(#etiket')).toEqual([]);
    expect(values('https://localhost/($THYAO')).toEqual([]);
  });

  it('URL ile diğer entity türleri sırayla döner', () => {
    expect(values('$THYAO https://a.com #bist @ali')).toEqual([
      'cashtag:THYAO',
      'url:https://a.com',
      'hashtag:bist',
      'mention:ali',
    ]);
  });
});

describe('parseEntities — genel', () => {
  it('boş metin', () => {
    expect(parseEntities('')).toEqual([]);
  });

  it('çok satırlı metinde offset’ler slice ile birebir', () => {
    const text = 'satır 1\n$THYAO\r\n#bist100 @ali_1';
    for (const entity of parseEntities(text)) {
      expect('$#@'.includes(text.charAt(entity.start))).toBe(true);
    }
    expect(values(text)).toEqual(['cashtag:THYAO', 'hashtag:bist100', 'mention:ali_1']);
  });

  it('eski markup dönüştürülmeden entity üretmez', () => {
    expect(values('$(THYAO) #(bist100) @(ali)')).toEqual([]);
  });
});

describe('firstPreviewableUrl', () => {
  it('ilk URL’nin href’ini döner', () => {
    expect(firstPreviewableUrl(parseEntities('$THYAO www.a.com https://b.com'))).toBe(
      'https://www.a.com'
    );
  });

  it('URL yoksa null', () => {
    expect(firstPreviewableUrl(parseEntities('$THYAO #bist'))).toBeNull();
    expect(firstPreviewableUrl([])).toBeNull();
  });
});
