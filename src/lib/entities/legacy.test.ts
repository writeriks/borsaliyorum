import { describe, expect, it } from 'vitest';

import { fromLegacyMarkup } from './legacy';
import { summarize } from './test-utils';

describe('fromLegacyMarkup', () => {
  it.each([
    ['$(THYAO) yükselir', '$THYAO yükselir'],
    ['#(bist100) @(ali)', '#bist100 @ali'],
    ["$(THYAO)'nun #(bilanço)'su", "$THYAO'nun #bilanço'su"],
    ['düz metin', 'düz metin'],
    ['$() #() @()', '$() #() @()'],
    ['(parantez) $5', '(parantez) $5'],
    ['$(A\nB)', '$(A\nB)'],
    ['$(THYAO)$(ASELS)', '$THYAO$ASELS'],
  ])('%j → %j', (input, expected) => {
    expect(fromLegacyMarkup(input)).toBe(expected);
  });

  it('dönüşüm sonrası aynı parser’dan geçer', () => {
    expect(summarize(fromLegacyMarkup('$(THYAO) için #(BİST100) @(Ali_1)'))).toEqual([
      { type: 'cashtag', text: '$THYAO', value: 'THYAO' },
      { type: 'hashtag', text: '#BİST100', value: 'bist100' },
      { type: 'mention', text: '@Ali_1', value: 'ali_1' },
    ]);
  });
});
