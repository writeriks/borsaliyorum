'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

import { getPathname } from '@/i18n/navigation';
import { SIGNED_OUT_EVENT } from '@/lib/auth-events';
import { deleteSession } from '@/lib/auth/session-api';
import type { ClientSession } from '@/lib/auth/types';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'auth-provider' });

export type AuthPending = 'signing-in' | 'signing-out' | null;

export type AuthContextValue = {
  readonly session: ClientSession;
  /** Yalnızca giriş/çıkış işlemi sürerken dolu; sayfa yüklemesinde asla (sunucu bilir). */
  readonly pending: AuthPending;
  readonly setPending: (pending: AuthPending) => void;
  /** Giriş/kayıt sonrası sunucunun döndürdüğü oturumu hemen yansıtır (router.refresh beklemeden). */
  readonly applySession: (session: ClientSession) => void;
  /** Çıkış: UI anında anonim, sunucu çağrısı arkada; başarısızsa geri alır ve toast gösterir. */
  readonly signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type Override = { readonly base: ClientSession; readonly value: ClientSession };

/**
 * Tek auth sağlayıcısı (coding-standards: global kaynağa tek abonelik). Başlangıç durumu
 * sunucudan gelir (`getSession()` → root layout); ilk render'da "çözülüyor" durumu yoktur.
 * Firebase `onAuthStateChanged` aboneliği YOK: istemci SDK'sı yalnızca giriş anında yüklenir.
 *
 * `override`, sunucudan yeni bir oturum gelene kadar (router.refresh / tam yükleme) geçerlidir:
 * `base` referansı değişince kendiliğinden düşer.
 */
export const AuthProvider = ({
  session: serverSession,
  children,
}: {
  session: ClientSession;
  children: ReactNode;
}): ReactElement => {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [override, setOverride] = useState<Override | null>(null);
  const [pending, setPending] = useState<AuthPending>(null);

  const session =
    override !== null && override.base === serverSession ? override.value : serverSession;

  const applySession = useCallback(
    (value: ClientSession) => setOverride({ base: serverSession, value }),
    [serverSession]
  );

  const signOut = useCallback(async (): Promise<void> => {
    setPending('signing-out');
    setOverride({ base: serverSession, value: { status: 'anonymous' } });
    const result = await deleteSession();
    if (!result.ok) {
      setOverride(null);
      setPending(null);
      toast.error(t('signOut.failed'));
      return;
    }
    window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
    // Tam sayfa geçişi: istemci router önbelleğindeki korumalı sayfalar atılır, geri tuşu
    // sunucuya gider ve oturumsuz istek girişe yönlenir.
    window.location.replace(getPathname({ href: '/', locale }));
  }, [locale, serverSession, t]);

  const authenticated = session.status === 'authenticated';
  useEffect(() => {
    if (!authenticated) return undefined;
    // bfcache'ten geri gelen girişli sayfa eski durumu gösterebilir (ör. başka sekmede çıkış):
    // sunucudan tazele.
    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [authenticated]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, pending, setPending, applySession, signOut }),
    [session, pending, applySession, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Auth durumunu okur; abonelik açmaz. AuthProvider dışında çağrılırsa hata. */
export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) {
    log.error('useAuth outside AuthProvider');
    throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  }
  return value;
};

/** Sağlayıcı olmayabilecek yerler (kabuk bileşenlerinin izole testleri) için. */
export const useOptionalAuth = (): AuthContextValue | null => useContext(AuthContext);
