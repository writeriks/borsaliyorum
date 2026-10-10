import 'server-only';

import { parseSafeFetchTestAllow, parseServerEnv, type ServerEnv } from '@/lib/env';

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
