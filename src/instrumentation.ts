import { assertNoAuthEmulatorInProduction } from '@/lib/env';

/**
 * Sunucu başlangıcı (Next instrumentation). Emulator değişkeni production'da set ise süreç
 * hiç istek almadan durur: emulator token'ları imzasızdır (ADR-0001 Karar 5). Aynı kontrol
 * build'de (`assertBuildEnv`) ve `getServerEnv()`'de de var; burası en erken nokta.
 */
export const register = (): void => {
  assertNoAuthEmulatorInProduction(process.env);
};
