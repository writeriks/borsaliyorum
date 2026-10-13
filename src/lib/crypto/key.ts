import 'server-only';

import { getServerEnv } from '@/lib/env.server';

/**
 * Uygulamanın IP şifreleme anahtarı (`IP_ENCRYPTION_KEY`, base64 32 bayt). Production
 * runtime'da env doğrulaması zaten zorunlu kılar; geliştirmede tanımsızsa ContentEvent yazan
 * işlem açık bir hatayla durur (IP'siz kayıt CHECK kısıtına da takılırdı).
 */
export const getIpEncryptionKey = (): Uint8Array => {
  const key = getServerEnv().IP_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "IP_ENCRYPTION_KEY tanımlı değil. Üret: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  return key;
};
