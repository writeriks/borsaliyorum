import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { describe, expect, it } from 'vitest';

import { legacyRedirects } from '../../next.config';

import { LEGACY_REDIRECTS } from './legacy-redirects';

/**
 * Next'in `redirects()` eşleştiricisiyle (aynı `getPathMatch` + `strict`, büyük/küçük harf
 * duyarsız) kaynağı çözer, hedefteki `:id`'yi yerleştirir: desen hataları E2E'siz yakalanır
 * (gerçek 301 yanıtı `post.detail.spec.ts`'te).
 */
const resolve = (pathname: string): { destination: string; statusCode: number } | null => {
  for (const redirect of LEGACY_REDIRECTS) {
    const params = getPathMatch(redirect.source, { strict: true, removeUnnamedParams: true })(
      pathname
    );
    if (params) {
      return {
        destination: redirect.destination.replace(':id', String(params.id)),
        statusCode: redirect.statusCode,
      };
    }
  }
  return null;
};

describe('eski URL yönlendirmeleri (K7)', () => {
  it('/posts/:id, /tr/posts/:id → /gonderi/:id; /en/posts/:id → /en/gonderi/:id; hepsi 301', () => {
    expect(resolve('/posts/123')).toEqual({ destination: '/gonderi/123', statusCode: 301 });
    expect(resolve('/tr/posts/123')).toEqual({ destination: '/gonderi/123', statusCode: 301 });
    expect(resolve('/en/posts/42')).toEqual({ destination: '/en/gonderi/42', statusCode: 301 });
  });

  it('sayısal olmayan, fazla uzun ya da alt yollu kimlik eşleşmez', () => {
    for (const path of [
      '/posts/abc',
      '/posts/12a',
      '/posts/12345678901',
      '/posts/1/yorumlar',
      '/posts/',
      '/de/posts/1',
      '/gonderi/1',
    ]) {
      expect(resolve(path), path).toBeNull();
    }
  });

  it('next.config redirects() listeyi aynen verir (308 değil 301)', async () => {
    const redirects = await legacyRedirects?.();
    expect(redirects).toEqual(LEGACY_REDIRECTS);
    for (const redirect of redirects ?? []) {
      expect(redirect).not.toHaveProperty('permanent');
    }
  });
});
