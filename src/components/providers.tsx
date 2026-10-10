'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactElement, ReactNode } from 'react';

import { AuthProvider } from '@/components/auth/auth-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ClientSession } from '@/lib/auth/types';

/** next-themes'in localStorage anahtarı (tercih yalnızca bu cihazda; çerez değil) */
export const THEME_STORAGE_KEY = 'theme';

/**
 * Global istemci sağlayıcıları tek yerde (coding-standards: global kaynağa tek abonelik).
 * next-themes `<html>`'e sınıfı boyamadan önce çalışan satır içi script ile koyar → flash yok.
 * Varsayılan koyu; kullanıcı "Sistem"i seçebilir.
 */
export const Providers = ({
  children,
  session,
}: {
  children: ReactNode;
  /** Sunucuda çözülmüş oturum (root layout `getSession()`); istemci keşfetmez. */
  session: ClientSession;
}): ReactElement => (
  <ThemeProvider
    attribute='class'
    defaultTheme='dark'
    enableSystem
    disableTransitionOnChange
    storageKey={THEME_STORAGE_KEY}
  >
    <AuthProvider session={session}>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </AuthProvider>
  </ThemeProvider>
);
