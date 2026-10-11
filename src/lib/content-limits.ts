/**
 * Gönderi ve yorum metninin grafem (`countChars`) sınırları — tek kaynak. Composer sayacı ve
 * gönder düğmesi (S8) ile sunucu Zod şemaları (S10 `createPost`/`createComment`) buradan okur;
 * istemci ile sunucu farklı sınır uygulayamaz. Karar: ADR-0002 Karar 3, `docs/plan/kararlar.md` K11.
 */
export const CONTENT_MAX_CHARS = { post: 1000, comment: 500 } as const;

export type ContentKind = keyof typeof CONTENT_MAX_CHARS;

/**
 * Ham metnin UTF-16 code unit sınırı (grafem sınırının 4 katı). Grafem sayımı tek başına yetmez:
 * bir grafem sınırsız uzunlukta olabilir (birleştirici işaret, ZWJ dizisi), 1000 grafemlik metin
 * megabaytlarca yük taşıyabilirdi. Sunucu bunu normalize/parse'tan **önce** uygular
 * (`analyzeContentForWrite`), composer da aynı sabitle gönder düğmesini kapatır. Aşım kullanıcıya
 * grafem sınırıyla aynı mesajla (`CONTENT_TOO_LONG`) bildirilir.
 */
export const CONTENT_MAX_CODE_UNITS = { post: 4000, comment: 2000 } as const satisfies Record<
  ContentKind,
  number
>;
