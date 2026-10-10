import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { decodeBase64Key } from './base64-key';
import {
  decodeIpEncryptionKey,
  decryptIp,
  encryptIp,
  IP_CIPHER_VERSION,
  IpCryptoError,
} from './ip';

const key = randomBytes(32);

describe('encryptIp / decryptIp', () => {
  it.each(['203.0.113.7', '2001:db8::1', '::', '::ffff:198.51.100.23'])('round-trips %s', ip => {
    const blob = encryptIp(ip, key);

    expect(blob[0]).toBe(IP_CIPHER_VERSION);
    expect(decryptIp(blob, key)).toBe(ip);
    // Düz metin, maske ya da hash değil: IP baytları blob'da görünmez
    expect(Buffer.from(blob).includes(ip)).toBe(false);
  });

  it('uses a fresh IV every time (same IP, different ciphertext)', () => {
    const a = Buffer.from(encryptIp('203.0.113.7', key));
    const b = Buffer.from(encryptIp('203.0.113.7', key));
    expect(a.equals(b)).toBe(false);
  });

  it('fits the DB minimum length check (>= 31 bytes)', () => {
    expect(encryptIp('::', key).byteLength).toBeGreaterThanOrEqual(31);
  });

  it('rejects invalid IPs and wrong key sizes', () => {
    expect(() => encryptIp('not-an-ip', key)).toThrow(IpCryptoError);
    expect(() => encryptIp('10.0.0.1/8', key)).toThrow(IpCryptoError);
    expect(() => encryptIp('203.0.113.7', randomBytes(16))).toThrow(/32 bayt/);
  });

  it('fails authentication with the wrong key or tampered data', () => {
    const blob = encryptIp('203.0.113.7', key);
    expect(() => decryptIp(blob, randomBytes(32))).toThrow(/doğrulanamadı/);

    const tampered = Uint8Array.from(blob);
    tampered[tampered.length - 1] = (tampered.at(-1) ?? 0) ^ 0xff;
    expect(() => decryptIp(tampered, key)).toThrow(/doğrulanamadı/);
  });

  it('rejects unknown versions and truncated blobs', () => {
    const blob = Uint8Array.from(encryptIp('203.0.113.7', key));
    blob[0] = 9;
    expect(() => decryptIp(blob, key)).toThrow(/sürüm/);
    expect(() => decryptIp(new Uint8Array(10), key)).toThrow(/kısa/);
  });
});

describe('decodeIpEncryptionKey', () => {
  it('accepts exactly 32 bytes of canonical base64', () => {
    const encoded = key.toString('base64');
    expect(Buffer.from(decodeIpEncryptionKey(encoded) ?? []).equals(key)).toBe(true);
  });

  it.each([
    ['16 bytes', randomBytes(16).toString('base64')],
    ['33 bytes', randomBytes(33).toString('base64')],
    ['hex', randomBytes(32).toString('hex')],
    ['missing padding', randomBytes(32).toString('base64').replace(/=$/, '')],
    ['invalid characters', `${randomBytes(32).toString('base64').slice(0, -2)}*=`],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(decodeIpEncryptionKey(value)).toBeNull();
    expect(decodeBase64Key(value, 32)).toBeNull();
  });
});
