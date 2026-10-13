import { describe, expect, it } from 'vitest';

import { isMarketingConsentEnabled } from './feature-flags';

describe('isMarketingConsentEnabled', () => {
  it('varsayılan KAPALI (tanımsız, boş, yanlış yazım)', () => {
    expect(isMarketingConsentEnabled({})).toBe(false);
    for (const value of ['', 'false', '0', '1', 'yes', 'on', 'tru']) {
      expect(isMarketingConsentEnabled({ MARKETING_CONSENT_ENABLED: value }), value).toBe(false);
    }
  });

  it('yalnızca "true" açar (büyük/küçük harf ve boşluk duyarsız)', () => {
    for (const value of ['true', 'TRUE', ' True ']) {
      expect(isMarketingConsentEnabled({ MARKETING_CONSENT_ENABLED: value }), value).toBe(true);
    }
  });
});
