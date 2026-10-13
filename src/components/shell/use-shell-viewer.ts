'use client';

import { useOptionalAuth } from '@/components/auth/auth-provider';

import type { ShellViewer } from './types';

/**
 * Kabuğun gördüğü oturum. AuthProvider varsa (uygulamada her zaman) oradan okunur: sunucunun
 * ilk durumu + giriş/çıkış anındaki değişiklik (çıkışta UI anında anonime döner). Sağlayıcısız
 * izole testlerde prop kullanılır. Onboarding'i bitmemiş hesap "Kaydı tamamla" görür (giriş
 * yapmış birine "Giriş yap" gösterilmez). Giriş sürerken oturum belirsizdir: "Giriş yap"
 * yerine skeleton (auth-session UX kuralı 1); başarısız girişte anonime geri döner.
 */
export const useShellViewer = (fallback: ShellViewer): ShellViewer => {
  const auth = useOptionalAuth();
  if (!auth) return fallback;
  const { session, pending } = auth;
  if (session.status === 'needs-onboarding') return { status: 'needs-onboarding' };
  if (session.status !== 'authenticated') {
    return pending === 'signing-in' ? { status: 'unknown' } : { status: 'anonymous' };
  }
  const { username, displayName, avatarUrl } = session.user;
  return { status: 'authenticated', user: { username, displayName, avatarUrl } };
};
