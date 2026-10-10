import { describe, expect, it } from 'vitest';

import { normalizePreviewUrl } from './normalize-preview-url';

describe('normalizePreviewUrl (geçici kopya)', () => {
  it('fragment ve izleme parametrelerini atar, diğer parametreleri sırasıyla korur', () => {
    expect(
      normalizePreviewUrl(
        'https://KAP.org.tr/tr/Bildirim/1?b=2&utm_source=x&UTM_Medium=y&a=1&fbclid=z&gclid=q#bolum'
      )
    ).toBe('https://kap.org.tr/tr/Bildirim/1?b=2&a=1');
  });

  it('yalnızca izleme parametresi varsa `?` kalmaz; varsayılan port atılır', () => {
    expect(normalizePreviewUrl('https://kap.org.tr:443/x?utm_campaign=c')).toBe(
      'https://kap.org.tr/x'
    );
  });

  it('geçersiz URL’de hata fırlatır', () => {
    expect(() => normalizePreviewUrl('kap.org.tr')).toThrow(TypeError);
  });
});
