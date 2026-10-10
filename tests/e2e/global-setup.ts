import { createMigratedDatabase } from '../db/admin';

import { E2E_DATABASE } from './support/env';

/**
 * E2E veritabanı her koşuda sıfırdan kurulur ve gerçek migration'lar uygulanır (ADR-0003
 * Karar 3). Sunucu bu DB'ye ilk istekte bağlanır; testler kendi kullanıcılarını benzersiz
 * adlarla oluşturur ve yalnızca kendi verilerini assert eder (paralel güvenli).
 *
 * Emulator hesapları toplu silinmez: aynı emulator'ü paylaşan başka bir koşuyu bozmamak için
 * her test benzersiz e-posta kullanır.
 */
const globalSetup = async (): Promise<void> => {
  await createMigratedDatabase(E2E_DATABASE);
};

export default globalSetup;
