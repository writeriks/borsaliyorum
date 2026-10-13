/**
 * Base64 kodlu sabit uzunluklu anahtarı çözer; geçersizse null. Node API'si kullanmaz
 * (`src/lib/env.ts` istemci bundle'ına da girer). Katı: geri kodlama girdiyle aynı olmalı
 * (geçersiz karakter, eksik/fazla dolgu ya da yanlış uzunluk kabul edilmez).
 */
export const decodeBase64Key = (base64: string, bytes: number): Uint8Array | null => {
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    return null;
  }
  if (binary.length !== bytes || btoa(binary) !== base64) return null;
  return Uint8Array.from(binary, char => char.charCodeAt(0));
};
