'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useCallback } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { getPathname } from '@/i18n/navigation';
import { safeNextPath } from '@/lib/auth/rules';
import { hardNavigate } from '@/lib/client/hard-navigate';

import type { SignedInSession } from '../client/auth-flows';

/**
 * Başarılı giriş/kayıttan sonra: oturum AuthProvider'a hemen yansır (navigasyon sürerken
 * "Giriş yap" görünmez), kullanıcı `next`'e (yoksa akışa) gider; onboarding gerekiyorsa `next`
 * korunarak onboarding'e (auth-session UX kuralı 3).
 *
 * Oturum anonimken açıldıysa geçiş **tam sayfa** olur: istemci router'ı anonimken prefetch
 * ettiği korumalı rotaları proxy'nin `/giris?next=…` yönlendirmesiyle önbellekler ve
 * `router.refresh()` bu girdileri temizlemez. Yumuşak geçiş `/akis` → (önbellek) `/giris` →
 * (sunucu, artık girişli) `/akis` → … sonsuz döngüye giriyordu. Zaten girişli kullanıcının
 * yeniden doğrulaması (reverify) önbelleği bozmadığı için yumuşak kalır (toast korunur).
 */
export const useFinishSignIn = (next: string | null): ((session: SignedInSession) => void) => {
  const router = useRouter();
  const locale = useLocale();
  const { session: current, applySession } = useAuth();
  const wasAuthenticated = current.status === 'authenticated';

  return useCallback(
    (session: SignedInSession) => {
      applySession(session);
      const safeNext = safeNextPath(next);
      const target =
        session.status === 'needs-onboarding'
          ? getPathname({
              href: { pathname: '/hos-geldin', query: safeNext ? { next: safeNext } : {} },
              locale,
            })
          : (safeNext ?? getPathname({ href: '/akis', locale }));
      if (!wasAuthenticated) {
        hardNavigate(target);
        return;
      }
      router.replace(target);
      router.refresh();
    },
    [applySession, locale, next, router, wasAuthenticated]
  );
};
