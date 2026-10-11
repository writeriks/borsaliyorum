import { describe, expect, it } from 'vitest';

import {
  assertLegalTextsPublishable,
  findUnfilledPlaceholders,
  LegalPlaceholderError,
} from './publish-gate';

const filled = { documents: { terms: { sections: [{ blocks: [{ text: 'Ünvan A.Ş.' }] }] } } };
const unfilled = {
  placeholders: { company: 'Şirket unvanı' },
  documents: {
    privacy: { sections: [{ blocks: [{ text: 'Veri sorumlusu [[ph:company]]' }] }] },
    terms: {
      sections: [
        {
          blocks: [
            {
              rows: [
                ['Adres', '[[ph:address]]'],
                ['x', '[[ph:company]]'],
              ],
            },
          ],
        },
      ],
    },
  },
};

describe('findUnfilledPlaceholders', () => {
  it('iç içe tüm metinlerdeki [[ph:…]] anahtarlarını dil önekiyle, tekil ve sıralı döner', () => {
    expect(findUnfilledPlaceholders({ tr: unfilled, en: filled })).toEqual([
      'tr:address',
      'tr:company',
    ]);
    expect(findUnfilledPlaceholders({ tr: filled, en: filled })).toEqual([]);
  });
});

describe('assertLegalTextsPublishable', () => {
  it('VERCEL_ENV=production iken yer tutucu varsa hata; SKIP_ENV_VALIDATION etkisiz', () => {
    expect(() =>
      assertLegalTextsPublishable(
        { VERCEL_ENV: 'production', SKIP_ENV_VALIDATION: '1' },
        { tr: unfilled }
      )
    ).toThrow(LegalPlaceholderError);
    expect(() =>
      assertLegalTextsPublishable({ VERCEL_ENV: 'production' }, { tr: unfilled })
    ).toThrow(/tr:address, tr:company/);
  });

  it('production dışında (preview, yerel) ya da metinler doluysa geçer', () => {
    expect(() =>
      assertLegalTextsPublishable({ VERCEL_ENV: 'preview' }, { tr: unfilled })
    ).not.toThrow();
    expect(() => assertLegalTextsPublishable({}, { tr: unfilled })).not.toThrow();
    expect(() =>
      assertLegalTextsPublishable({ VERCEL_ENV: 'production' }, { tr: filled, en: filled })
    ).not.toThrow();
  });
});
