import { describe, expect, it } from 'vitest';

import { toSafeMediaSrc, toSafeStorageMediaSrc } from './safe-src';

describe('toSafeMediaSrc (medya host allowlist)', () => {
  it.each([
    'https://firebasestorage.googleapis.com/v0/b/ornek/o/a.png?alt=media',
    'https://storage.googleapis.com/ornek-bucket/a.png',
  ])('%s kabul edilir', src => {
    expect(toSafeMediaSrc(src)).toBe(src);
  });

  it.each([
    'https://lh3.googleusercontent.com/a/x',
    'https://ornek.com/a.png',
    'https://alt.firebasestorage.googleapis.com/a.png',
    'http://storage.googleapis.com/a.png',
    'https://storage.googleapis.com:8443/a.png',
    'https://user:pw@storage.googleapis.com/a.png',
    'https://user@storage.googleapis.com/a.png',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'bozuk url',
    '',
  ])('%s reddedilir', src => {
    expect(toSafeMediaSrc(src)).toBeNull();
  });

  it('null/undefined → null', () => {
    expect(toSafeMediaSrc(null)).toBeNull();
    expect(toSafeMediaSrc(undefined)).toBeNull();
  });
});

describe('toSafeStorageMediaSrc (bucket/yol kontrolü, sunucu DTO süzgeci)', () => {
  const BUCKET = 'borsaliyorum.appspot.com';

  it.each([
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/avatars%2Fa.png?alt=media&token=x`,
    `https://storage.googleapis.com/${BUCKET}/avatars/a.png`,
  ])("kendi bucket'ımız kabul edilir: %s", src => {
    expect(toSafeStorageMediaSrc(src, BUCKET)).toBe(src);
  });

  it.each([
    // Başka bucket (aynı paylaşımlı host): izleme pikseli / keyfi içerik
    'https://firebasestorage.googleapis.com/v0/b/kotu-bucket/o/a.png?alt=media',
    'https://storage.googleapis.com/kotu-bucket/a.png',
    // Önek benzerliği: bucket adı tam segment olmalı
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}x/o/a.png`,
    `https://storage.googleapis.com/${BUCKET}-kotu/a.png`,
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}`,
    // Yanlış host-yol eşleşmesi
    `https://storage.googleapis.com/v0/b/${BUCKET}/o/a.png`,
    `https://firebasestorage.googleapis.com/${BUCKET}/a.png`,
    // Yol gezinme normalize edilir, sonra karşılaştırılır
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/../kotu-bucket/o/a.png`,
    `https://storage.googleapis.com/${BUCKET}/%2e%2e/kotu-bucket/a.png`,
    // Yüzde kodlu bucket adı: fail-closed
    'https://storage.googleapis.com/borsaliyorum%2Eappspot.com/a.png',
    // Host düzeyi kurallar da geçerli
    `http://storage.googleapis.com/${BUCKET}/a.png`,
    `https://storage.googleapis.com:8443/${BUCKET}/a.png`,
    `https://u@storage.googleapis.com/${BUCKET}/a.png`,
    `https://ornek.com/${BUCKET}/a.png`,
    'bozuk url',
  ])('reddedilir: %s', src => {
    expect(toSafeStorageMediaSrc(src, BUCKET)).toBeNull();
  });

  it.each(['', '   ', 'A', '/', 'kotu/../bucket', 'Borsaliyorum.appspot.com'])(
    'geçersiz bucket ayarı (%j) → her URL reddedilir',
    bucket => {
      expect(
        toSafeStorageMediaSrc(`https://storage.googleapis.com/${bucket}/a.png`, bucket)
      ).toBeNull();
    }
  );

  it('null/undefined → null', () => {
    expect(toSafeStorageMediaSrc(null, BUCKET)).toBeNull();
    expect(toSafeStorageMediaSrc(undefined, BUCKET)).toBeNull();
  });
});
