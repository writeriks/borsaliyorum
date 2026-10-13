import { describe, expect, it } from 'vitest';

import { toLinkPreviewDto } from './link-preview';
import type { PostLinkPreview } from './types';

type ReadyPreview = Extract<PostLinkPreview, { status: 'ready' }>;

const ready = (overrides: Partial<ReadyPreview> = {}): ReadyPreview => ({
  status: 'ready',
  url: 'https://www.ornek.com/haber',
  siteName: 'Örnek',
  title: 'Başlık',
  description: 'Açıklama',
  ...overrides,
});

describe('toLinkPreviewDto', () => {
  it('hazır önizleme: kanonik URL, www’siz host, kırpılmış metinler', () => {
    expect(toLinkPreviewDto(ready({ title: '  Başlık  ', description: '   ' }))).toEqual({
      url: 'https://www.ornek.com/haber',
      host: 'ornek.com',
      siteName: 'Örnek',
      title: 'Başlık',
      description: null,
    });
  });

  it('homograf host punycode', () => {
    const dto = toLinkPreviewDto(ready({ url: new URL('https://аpple.com/x').href }));
    expect(dto?.host).toBe('xn--pple-43d.com');
  });

  it.each<[string, PostLinkPreview]>([
    ['none', { status: 'none' }],
    ['pending (salt okunur kartta iskelet yok)', { status: 'pending' }],
    ['javascript:', ready({ url: 'javascript:alert(1)' })],
    ['data:', ready({ url: 'data:text/html,x' })],
    ['kullanıcı bilgili URL', ready({ url: 'https://u:p@ornek.com/' })],
    ['başlıksız', ready({ title: null })],
    ['boş başlık', ready({ title: '  ' })],
  ])('%s → null', (_label, preview) => {
    expect(toLinkPreviewDto(preview)).toBeNull();
  });
});
