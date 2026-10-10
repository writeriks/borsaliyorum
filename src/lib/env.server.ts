import 'server-only';

import {
  clientEnvSchema,
  parseSafeFetchTestAllow,
  parseServerEnv,
  type ServerEnv,
} from '@/lib/env';

let cached: ServerEnv | undefined;

/** Sunucu env'i ilk kullanımda doğrulanır; eksikse istek açık bir hatayla düşer. */
export const getServerEnv = (): ServerEnv => {
  cached ??= parseServerEnv(process.env);
  return cached;
};

/**
 * safeFetch test allowlist'i. Önbelleğe alınmaz (testler env'i dosya bazında değiştirir);
 * üretimde tanımlıysa her çağrıda hata fırlatır, böylece önizleme hiç çalışmaz (fail-closed).
 */
export const getSafeFetchTestAllow = (): readonly string[] => parseSafeFetchTestAllow(process.env);

/**
 * Sitenin kök URL'si (`NEXT_PUBLIC_SITE_URL`, opsiyonel). Sunucu tarafında iç link tespiti için;
 * testler env'i değiştirebildiği için önbelleğe alınmaz. Geçersiz değer yapılandırma hatasıdır.
 */
export const getSiteUrl = (): string | undefined =>
  clientEnvSchema.shape.NEXT_PUBLIC_SITE_URL.parse(process.env.NEXT_PUBLIC_SITE_URL);
