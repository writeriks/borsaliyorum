'use client';

import { useOptionalAuth } from '@/components/auth/auth-provider';

import type { ShellViewer } from './types';

/**
 * Kabuğun gördüğü oturum. AuthProvider varsa (uygulamada her zaman) oradan okunur: sunucunun
 * ilk durumu + giriş/çıkış anındaki değişiklik (çıkışta UI anında anonime döner). Sağlayıcısız
 * izole testlerde prop kullanılır. Onboarding'i bitmemiş hesap "Kaydı tamamla" görür (giriş
 * yapmış birine "Giriş yap" gösterilmez).
 */
export const useShellViewer = (fallback: ShellViewer): ShellViewer => {
  const auth = useOptionalAuth();
  if (!auth) return fallback;
  const { session } = auth;
  if (session.status === 'needs-onboarding') return { status: 'needs-onboarding' };
  if (session.status !== 'authenticated') return { status: 'anonymous' };
  const { username, displayName, avatarUrl } = session.user;
  return { status: 'authenticated', user: { username, displayName, avatarUrl } };
};
