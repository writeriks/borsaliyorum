import { ErrorCode, fail, ok } from '@/lib/errors';

import type { WriterGate } from './writer';

/**
 * Yasal metin paketi (`legalBundleVersion`) güncel değilse yazma kapalı, okuma serbest
 * (`LEGAL_ACCEPTANCE_REQUIRED` → istemci `/yasal/yeni-surum`'a yönlenir, `useActionResult`).
 * `legalAcceptanceRequired` oturum çözülürken DB'deki sürümden hesaplanır (`user-record.ts`).
 */
export const legalAcceptanceGate: WriterGate = async user =>
  user.legalAcceptanceRequired ? fail(ErrorCode.LEGAL_ACCEPTANCE_REQUIRED) : ok(null);

/**
 * `requireWriter`'a bağlı ek yazma kapıları (sırayla; e-posta doğrulamasından sonra). Yazma
 * koşullarının TEK kaynağı: her yazma action'ı (gönderi, yorum, beğeni …) otomatik kapsanır;
 * action'larda veya `resolveWriter`'da ayrıca kontrol edilmez.
 */
export const WRITER_GATES: readonly WriterGate[] = [legalAcceptanceGate];
