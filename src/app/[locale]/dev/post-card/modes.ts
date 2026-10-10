// Sunucu sayfası ile istemci sağlayıcısının ortak sabitleri. 'use client' modülünden import edilen
// değerler sunucuda istemci referansına dönüştüğü için ayrı, saf bir modülde.
export const STATS_MODES = ['ok', 'error', 'slow'] as const;
export type StatsMode = (typeof STATS_MODES)[number];

export const VIEWER_MODES = ['unknown', 'anonymous', 'authenticated'] as const;
