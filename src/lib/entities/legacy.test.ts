import { describe, expect, it } from 'vitest';

import { fromLegacyMarkup, LEGACY_MENTION_PLACEHOLDER } from './legacy';
import type { ParsedEntity } from './types';

type Row = { type: ParsedEntity['type']; text: string; value: string };

const summarizeLegacy = (
  legacy: string,
  resolveMention?: (id: string) => string | null
): { text: string; entities: Row[] } => {
  const { text, entities } = fromLegacyMarkup(legacy, { resolveMention });
  return {
    text,
    entities: entities.map(entity => ({
      type: entity.type,
      text: text.slice(entity.start, entity.end),
      value:
        entity.type === 'cashtag'
          ? entity.ticker
          : entity.type === 'hashtag'
            ? entity.slug
            : entity.type === 'mention'
              ? entity.username
              : entity.href,
    })),
  };
};

describe('fromLegacyMarkup — metin', () => {
  it.each([
    ['$(THYAO) yükselir', '$THYAO yükselir'],
    ['#(bist100) @(ali)', '#bist100 @ali'],
    ["$(THYAO)'nun #(bilanço)'su", "$THYAO'nun #bilanço'su"],
    ['düz metin', 'düz metin'],
    ['$() #() @()', '$() #() @()'],
    ['(parantez) $5', '(parantez) $5'],
    ['$(A\nB)', '$(A\nB)'],
    ['$(THYAO)$(ASELS)', '$THYAO$ASELS'],
    [' $(THYAO)\r\n ', '$THYAO'],
  ])('%j → %j', (input, expected) => {
    expect(fromLegacyMarkup(input).text).toBe(expected);
  });
});

describe('fromLegacyMarkup — entity’ler markup sınırlarından', () => {
  it('yan yana cashtag’ler kaybolmaz', () => {
    expect(summarizeLegacy('$(THYAO),$(ASELS)').entities).toEqual([
      { type: 'cashtag', text: '$THYAO', value: 'THYAO' },
      { type: 'cashtag', text: '$ASELS', value: 'ASELS' },
    ]);
    expect(summarizeLegacy('$(THYAO)$(ASELS)').entities).toEqual([
      { type: 'cashtag', text: '$THYAO', value: 'THYAO' },
      { type: 'cashtag', text: '$ASELS', value: 'ASELS' },
    ]);
  });

  it('noktalı eski etiket bütün olarak korunur', () => {
    expect(summarizeLegacy('#(borsa.istanbul) güzel')).toEqual({
      text: '#borsa.istanbul güzel',
      entities: [{ type: 'hashtag', text: '#borsa.istanbul', value: 'borsa.istanbul' }],
    });
  });

  it('sol sınır gerektirmez; görünen ad ve slug ayrı', () => {
    expect(fromLegacyMarkup('x#(BİST100)')).toEqual({
      text: 'x#BİST100',
      entities: [{ type: 'hashtag', start: 1, end: 9, slug: 'bist100', name: 'BİST100' }],
    });
  });

  it('gramere uymayan markup metin olarak kalır, entity üretmez', () => {
    expect(summarizeLegacy('$(A) $(5K) #(1) #(borsa istanbul) #(ВIST) @(ab)')).toEqual({
      text: '$A $5K #1 #borsa istanbul #ВIST @ab',
      entities: [],
    });
  });

  it('markup dışındaki düz metin parser’dan geçer; markup ile çakışan sonuç atılır', () => {
    expect(summarizeLegacy('$(THYAO) bkz. https://kap.org.tr/x. #bist @(ali_1)')).toEqual({
      text: '$THYAO bkz. https://kap.org.tr/x. #bist @ali_1',
      entities: [
        { type: 'cashtag', text: '$THYAO', value: 'THYAO' },
        { type: 'url', text: 'https://kap.org.tr/x', value: 'https://kap.org.tr/x' },
        { type: 'hashtag', text: '#bist', value: 'bist' },
        { type: 'mention', text: '@ali_1', value: 'ali_1' },
      ],
    });
    // URL adayı markup'ı yutarsa markup kazanır.
    expect(summarizeLegacy('https://x.com/$(THYAO)').entities).toEqual([
      { type: 'cashtag', text: '$THYAO', value: 'THYAO' },
    ]);
  });

  it('mention kullanıcı adı küçük harfe iner, metin yazıldığı gibi', () => {
    expect(summarizeLegacy('@(Ali_1)').entities).toEqual([
      { type: 'mention', text: '@Ali_1', value: 'ali_1' },
    ]);
  });
});

describe('fromLegacyMarkup — e-posta id’li mention (KVKK)', () => {
  it('resolveMention yoksa e-posta metinde görünmez, mention üretilmez', () => {
    const result = fromLegacyMarkup('selam @(ali.veli@gmail.com) nasılsın');
    expect(result).toEqual({ text: `selam ${LEGACY_MENTION_PLACEHOLDER} nasılsın`, entities: [] });
    expect(result.text).not.toContain('gmail');
  });

  it('resolveMention null dönerse yer tutucu yazılır', () => {
    const resolveMention = (): string | null => null;
    expect(summarizeLegacy('@(a@b.com)', resolveMention)).toEqual({
      text: '@kullanıcı',
      entities: [],
    });
  });

  it('çözülen kullanıcı adı mention olur', () => {
    const resolveMention = (id: string): string | null => (id === 'a@b.com' ? 'Ayse_K' : null);
    expect(summarizeLegacy('@(a@b.com) ve @(c@d.com)', resolveMention)).toEqual({
      text: '@Ayse_K ve @kullanıcı',
      entities: [{ type: 'mention', text: '@Ayse_K', value: 'ayse_k' }],
    });
  });

  it('çözülen ad gramere uymuyorsa yine e-posta yazılmaz', () => {
    expect(summarizeLegacy('@(a@b.com)', () => 'a@b.com').text).toBe('@kullanıcı');
  });

  it('e-posta olmayan id için resolveMention çağrılmaz', () => {
    const calls: string[] = [];
    fromLegacyMarkup('@(ali)', {
      resolveMention: id => {
        calls.push(id);
        return null;
      },
    });
    expect(calls).toEqual([]);
  });
});
