/**
 * Çıkışta `window` üzerinde yayınlanan olay: istemcide tutulan kişisel veriler (composer
 * taslakları vb.) temizlensin. Tek kaynak: yayınlayan `AuthProvider.signOut`
 * (`src/components/auth/auth-provider.tsx`), dinleyen `ComposerGate`/`Composer`.
 */
export const SIGNED_OUT_EVENT = 'borsaliyorum:signed-out';
