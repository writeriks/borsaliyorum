import 'server-only';

import { revalidateTag, updateTag } from 'next/cache';

import type { Logger } from '@/lib/logger';

/**
 * Yazma action'ının önbellek geçersizleştirmesi — **action içinde, senkron** (`updateTag`):
 * yanıtla birlikte gelen RSC yükü (ve `router.refresh()`) yazarın kendi yazdığını görür
 * (read-your-own-writes). `after()` içinde yapılırsa yanıt eski önbellekle dönerdi. Başarısızlık
 * yazmayı geri almaz (satır zaten yazıldı); yalnızca loglanır.
 */
export const expireTagsNow = (tags: readonly string[], log: Logger): void => {
  for (const tag of tags) {
    try {
      updateTag(tag);
    } catch (error) {
      log.error('updateTag failed', { err: error, tag });
    }
  }
};

/**
 * Yanıt sonrası (`after()`) değişen veri için: arka planda tazelenir (stale-while-revalidate).
 * Yalnızca kullanıcının beklemediği güncellemelerde (ör. sonradan bağlanan link önizlemesi).
 */
export const revalidateTagsLater = (tags: readonly string[], log: Logger): void => {
  for (const tag of tags) {
    try {
      revalidateTag(tag, 'max');
    } catch (error) {
      log.error('revalidateTag failed', { err: error, tag });
    }
  }
};
