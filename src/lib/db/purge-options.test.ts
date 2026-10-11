import { describe, expect, it } from 'vitest';

import { purgeExitCode, resolvePurgeOptions } from './purge-options';

describe('resolvePurgeOptions', () => {
  it('varsayılan dry-run: bayraksız koşu (cron dahil) hiçbir şey silmez', () => {
    expect(resolvePurgeOptions([], {})).toEqual({
      execute: false,
      steps: ['db', 'firebase'],
      contentEventRetention: '2 years',
      firebaseDelete: false,
    });
  });

  it('--execute DB adımını açar; Firebase silmesi ayrıca ORPHAN_PURGE_ENABLED=true ister', () => {
    expect(resolvePurgeOptions(['--execute'], {})).toMatchObject({
      execute: true,
      firebaseDelete: false,
    });
    expect(resolvePurgeOptions(['--execute'], { ORPHAN_PURGE_ENABLED: 'true' })).toMatchObject({
      execute: true,
      firebaseDelete: true,
    });
    // Bayrak tek başına (--execute olmadan) silme açmaz; yalnızca tam olarak "true"
    expect(resolvePurgeOptions([], { ORPHAN_PURGE_ENABLED: 'true' }).firebaseDelete).toBe(false);
    expect(resolvePurgeOptions(['--execute'], { ORPHAN_PURGE_ENABLED: '1' }).firebaseDelete).toBe(
      false
    );
  });

  it('--only ile adım seçilir; süre parametresi okunur', () => {
    expect(
      resolvePurgeOptions(['--only=firebase', '--content-event-retention=18 months'], {})
    ).toMatchObject({ steps: ['firebase'], contentEventRetention: '18 months' });
    expect(resolvePurgeOptions(['--only=db'], {}).steps).toEqual(['db']);
  });

  it('bilinmeyen ya da eski (--dry-run) argüman hata: yazım hatası sessizce yutulmaz', () => {
    expect(() => resolvePurgeOptions(['--exectue'], {})).toThrow(/bilinmeyen/i);
    expect(() => resolvePurgeOptions(['--dry-run'], {})).toThrow(/bilinmeyen/i);
    expect(() => resolvePurgeOptions(['--only=hepsi'], {})).toThrow(/--only/);
  });
});

describe('purgeExitCode', () => {
  it('Firebase silme hatası (failureCount > 0) ya da fren → non-zero', () => {
    expect(purgeExitCode({ firebase: { failed: 0 } })).toBe(0);
    expect(purgeExitCode({ firebase: { skipped: true } })).toBe(0);
    expect(purgeExitCode({ firebase: { failed: 2 } })).toBe(1);
    expect(purgeExitCode({ firebase: { aborted: 'page-ratio' } })).toBe(1);
  });
});
