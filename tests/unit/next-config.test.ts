import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';
import { describe, expect, it, vi } from 'vitest';

import config, { baseConfig, noindexHeaders } from '../../next.config';

describe('next.config', () => {
  it('istemciye env gömmez (FIREBASE_PRIVATE_KEY vb. sızmasın)', () => {
    expect(baseConfig.env).toBeUndefined();
    vi.stubEnv('SKIP_ENV_VALIDATION', '1');
    const resolved = config(PHASE_DEVELOPMENT_SERVER);
    const leaked = Object.keys(resolved.env ?? {}).filter(key => !key.startsWith('NEXT_PUBLIC_'));
    expect(leaked).toEqual([]);
  });

  it('production build aşamasında eksik env build’i durdurur', () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('DATABASE_URL', '');
    expect(() => config(PHASE_PRODUCTION_BUILD)).toThrow(/DATABASE_URL/);
  });

  it('geliştirme sunucusunda env doğrulaması yapmaz', () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '');
    vi.stubEnv('DATABASE_URL', '');
    expect(() => config(PHASE_DEVELOPMENT_SERVER)).not.toThrow();
  });

  it('Vercel production dışında tüm yollara X-Robots-Tag: noindex ekler (S1 review #5)', async () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '1');
    for (const vercelEnv of ['preview', 'development', '']) {
      vi.stubEnv('VERCEL_ENV', vercelEnv);
      const headers = await config(PHASE_PRODUCTION_BUILD).headers?.();
      expect(headers).toEqual([
        { source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
      ]);
    }
  });

  // K12: yasal kapı ertelenmişken production da arama motorlarına kapalı kalır
  it('K12 ertelemesi sürerken Vercel production’da da noindex ekler', async () => {
    const headers = await noindexHeaders('production')?.();
    expect(headers).toEqual([
      { source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    ]);
  });

  it('K12: production build’de [[ph:…]] kalmışsa build durmaz, uyarı basar', () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '1');
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // Depodaki metinlerde şu an doldurulmamış yer tutucular var (docs/legal/README.md)
    expect(() => config(PHASE_PRODUCTION_BUILD)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/K12.*company/));
    warn.mockRestore();
  });

  it('preview/yerel build yer tutucularla devam eder (yalnızca production kapısı)', () => {
    vi.stubEnv('SKIP_ENV_VALIDATION', '1');
    for (const vercelEnv of ['preview', '']) {
      vi.stubEnv('VERCEL_ENV', vercelEnv);
      expect(() => config(PHASE_PRODUCTION_BUILD)).not.toThrow();
    }
  });
});
