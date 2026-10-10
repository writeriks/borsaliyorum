/**
 * Gönderi ve yorum metninin grafem (`countChars`) sınırları — tek kaynak. Composer sayacı ve
 * gönder düğmesi (S8) ile sunucu Zod şemaları (S10 `createPost`/`createComment`) buradan okur;
 * istemci ile sunucu farklı sınır uygulayamaz. Karar: ADR-0002 Karar 3, `docs/plan/kararlar.md` K11.
 */
export const CONTENT_MAX_CHARS = { post: 1000, comment: 500 } as const;

export type ContentKind = keyof typeof CONTENT_MAX_CHARS;
