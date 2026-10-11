import { CONTENT_MAX_CHARS, CONTENT_MAX_CODE_UNITS } from '@/lib/content-limits';

import type { ComposerMode } from '../types';

/**
 * Karakter sınırları (grafem, `countChars`): gönderi 1000, yorum 500 (K11). Sunucu şeması
 * (S10) aynı sabiti kullanır; burada yalnızca composer kipine eşlenir.
 */
export const CHAR_LIMITS: Readonly<Record<ComposerMode, number>> = CONTENT_MAX_CHARS;

/** Ham UTF-16 code unit sınırı (sunucu `analyzeContentForWrite` ile aynı sabit). */
export const CODE_UNIT_LIMITS: Readonly<Record<ComposerMode, number>> = CONTENT_MAX_CODE_UNITS;

export type CounterTone = 'hidden' | 'subtle' | 'warn' | 'danger';

export type CounterState = {
  tone: CounterTone;
  /** Negatifse sınır aşıldı (`-12`). */
  remaining: number;
  /** Dolu oranı, 0..1 (halka çizimi için, 1'de sabitlenir). */
  ratio: number;
};

/**
 * Tasarım §1.3: < %80 gizli, %80–%97 sakin, %98–%100 uyarı, > %100 tehlike.
 * Eşikler sınırın yüzdesi; 1000 için 800/980, 500 için 400/490 olur.
 */
export const getCounterState = (count: number, limit: number): CounterState => {
  const remaining = limit - count;
  const ratio = Math.min(1, count / limit);
  if (count > limit) return { tone: 'danger', remaining, ratio };
  if (count >= Math.ceil(limit * 0.98)) return { tone: 'warn', remaining, ratio };
  if (count >= Math.ceil(limit * 0.8)) return { tone: 'subtle', remaining, ratio };
  return { tone: 'hidden', remaining, ratio };
};

/** Ekran okuyucuya tek seferlik duyuru yapılan kalan-karakter eşikleri ([CNT-05]). */
// Küçükten büyüğe: yapıştırmayla birden çok eşik atlanırsa en küçük geçilen duyurulur
const ANNOUNCE_AT = [0, 20, 100] as const;

export type CounterAnnouncement = { kind: 'remaining'; n: number } | { kind: 'over' };

/**
 * Önceki → yeni kalan sayısı geçişinde duyurulacak eşik. Her tuşta duyuru yok: yalnızca
 * bir eşiğe **inilirken** ya da sınır ilk aşıldığında. 21 → 19 atlaması 20 eşiğini geçtiği
 * için duyurulur; 19 → 18 duyurulmaz.
 */
export const getCounterAnnouncement = (
  previousRemaining: number,
  remaining: number
): CounterAnnouncement | null => {
  if (remaining >= previousRemaining) return null;
  if (remaining < 0 && previousRemaining >= 0) return { kind: 'over' };
  for (const threshold of ANNOUNCE_AT) {
    if (previousRemaining > threshold && remaining <= threshold && remaining >= 0) {
      return { kind: 'remaining', n: threshold };
    }
  }
  return null;
};
