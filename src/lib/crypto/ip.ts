import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';

import { decodeBase64Key } from './base64-key';

/**
 * ContentEvent IP adresi şifrelemesi (legal L2, ADR-0001). IP düz metin, maskeli ya da hash'li
 * değil, AES-256-GCM ile şifreli saklanır: adli talepte tam IP çözülebilir, DB sızıntısında
 * okunamaz. `server-only` içermez (bakım script'leri de kullanabilir); anahtarı uygulama
 * kodu `getIpEncryptionKey()` (key.ts) ile alır.
 *
 * Biçim: [1 bayt sürüm][12 bayt IV][16 bayt GCM etiketi][şifreli UTF-8 IP]. Sürüm baytı anahtar
 * döndürmede (rotation) eski kayıtların hangi anahtarla çözüleceğini ayırt etmeye yarar.
 * Her kayıtta rastgele IV: aynı IP iki kez aynı şifreli metni üretmez (ilişkilendirme yok).
 */
export const IP_CIPHER_VERSION = 1;
export const IP_KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = 1 + IV_BYTES + TAG_BYTES;
// Şifreli metni başka bir alana/tabloya taşıyıp çözdürmeyi engeller
const AAD = Buffer.from('borsaliyorum:ContentEvent.ip:v1', 'utf8');

export class IpCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IpCryptoError';
  }
}

const assertKey = (key: Uint8Array): void => {
  if (key.byteLength !== IP_KEY_BYTES) {
    throw new IpCryptoError(`IP şifreleme anahtarı ${IP_KEY_BYTES} bayt olmalı.`);
  }
};

/** `IP_ENCRYPTION_KEY` değerini (base64, 32 bayt) çözer; geçersizse null. */
export const decodeIpEncryptionKey = (base64: string): Uint8Array | null =>
  decodeBase64Key(base64, IP_KEY_BYTES);

/** IPv4/IPv6 metnini şifreler. Geçersiz IP reddedilir (kayda çöp girmesin). */
export const encryptIp = (ip: string, key: Uint8Array): Uint8Array<ArrayBuffer> => {
  assertKey(key);
  if (isIP(ip) === 0) throw new IpCryptoError('Geçersiz IP adresi.');
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(ip, 'utf8'), cipher.final()]);
  const out = new Uint8Array(HEADER_BYTES + ciphertext.byteLength);
  out[0] = IP_CIPHER_VERSION;
  out.set(iv, 1);
  out.set(cipher.getAuthTag(), 1 + IV_BYTES);
  out.set(ciphertext, HEADER_BYTES);
  return out;
};

/** `encryptIp` çıktısını çözer; yanlış anahtar ya da bozulmuş veri hata verir. */
export const decryptIp = (blob: Uint8Array, key: Uint8Array): string => {
  assertKey(key);
  if (blob.byteLength <= HEADER_BYTES) throw new IpCryptoError('Şifreli IP çok kısa.');
  if (blob[0] !== IP_CIPHER_VERSION) {
    throw new IpCryptoError(`Desteklenmeyen şifreli IP sürümü: ${blob[0]}`);
  }
  const iv = blob.subarray(1, 1 + IV_BYTES);
  const tag = blob.subarray(1 + IV_BYTES, HEADER_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(blob.subarray(HEADER_BYTES)), decipher.final()]).toString(
      'utf8'
    );
  } catch {
    // Node'un mesajı ("Unsupported state or unable to authenticate data") ayrıntı vermez
    throw new IpCryptoError('Şifreli IP doğrulanamadı (yanlış anahtar ya da bozuk veri).');
  }
};
