import type { WriterGate } from './writer';

/**
 * `requireWriter`'a bağlı ek yazma kapıları (sırayla). Boş: bu dalda e-posta doğrulamasının
 * ötesinde koşul yok. `claude/v2-legal` birleşince "yeni koşul sürümünü kabul etmeyen yazamaz"
 * kapısı buraya eklenir (her yazma action'ı otomatik kapsanır).
 */
export const WRITER_GATES: readonly WriterGate[] = [];
