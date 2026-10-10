/**
 * proxy.ts'in her sayfa isteğine yazdığı istek yolu (yerel öneki dahil, ör. `/en/akis?x=1`);
 * `requireUser` bundan `?next=` üretir. İstemcinin gönderdiği aynı adlı başlık proxy'de ezilir.
 * Tek tanım: proxy (edge) ve sunucu aynı sabiti kullanır.
 */
export const PATHNAME_HEADER = 'x-borsaliyorum-path';
