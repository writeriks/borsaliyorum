import type { Logger } from '@/lib/logger';

import type { SkippedEntity } from './segments';

/** Aynı süreçte hatırlanan farklı (metin, atlanan entity) çifti üst sınırı. */
const DEFAULT_CAPACITY = 500;

/** FNV-1a (32 bit): metnin kendisini bellekte tutmadan kısa anahtar. */
const fnv1a = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
};

export type SkipReporter = (text: string, skipped: readonly SkippedEntity[]) => void;

/**
 * Bozuk entity uyarısını aynı içerik için süreç başına **bir kez** yazar. Bozuk bir gönderi her
 * görüntülenişte (akış, detay, yeniden doğrulama) tekrar render edilir; her seferinde log satırı
 * teşhise bir şey katmaz, yalnızca gürültüdür (ör. `/dev/post-card`'daki düşmanca fixture).
 * Sınır dolunca küme sıfırlanır: bellek sabit kalır, en kötü durumda uyarı yeniden yazılır.
 */
export const createSkipReporter = (
  log: Pick<Logger, 'warn'>,
  capacity: number = DEFAULT_CAPACITY
): SkipReporter => {
  const seen = new Set<string>();
  return (text, skipped) => {
    if (skipped.length === 0) return;
    const key = `${fnv1a(text)}:${skipped.map(item => `${item.index}${item.reason}`).join(',')}`;
    if (seen.has(key)) return;
    if (seen.size >= capacity) seen.clear();
    seen.add(key);
    log.warn('entity atlandı; düz metin render ediliyor', { skipped });
  };
};
