'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useCallback } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { getPathname } from '@/i18n/navigation';
import { safeNextPath } from '@/lib/auth/rules';

import type { SignedInSession } from '../client/auth-flows';

/**
 * Başarılı giriş/kayıttan sonra: oturum AuthProvider'a hemen yansır, kullanıcı `next`'e (yoksa
 * akışa) gider; onboarding gerekiyorsa `next` korunarak onboarding'e. `router.refresh()` root
 * layout'u yeni çerezle yeniden render eder (auth-session UX kuralı 3).
 */
export const useFinishSignIn = (next: string | null): ((session: SignedInSession) => void) => {
  const router = useRouter();
  const locale = useLocale();
  const { applySession } = useAuth();

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
      router.replace(target);
      router.refresh();
    },
    [applySession, locale, next, router]
  );
};
