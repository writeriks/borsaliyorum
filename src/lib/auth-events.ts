/**
 * Çıkışta `window` üzerinde yayınlanan olay: istemcide tutulan kişisel veriler (composer
 * taslakları vb.) temizlensin. Değer S5'in `AuthProvider`'ının yayınladığıyla aynıdır
 * (`claude/v2-s5`: `src/components/auth/auth-provider.tsx` → `SIGNED_OUT_EVENT`); S5 birleşince
 * oradaki sabit bu modülden import edilmeli ki iki ayrı dize kalmasın.
 */
export const SIGNED_OUT_EVENT = 'borsaliyorum:signed-out';
