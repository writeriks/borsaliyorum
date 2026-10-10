'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactElement, ReactNode } from 'react';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

/** next-themes'in localStorage anahtarı (tercih yalnızca bu cihazda; çerez değil) */
export const THEME_STORAGE_KEY = 'theme';

/**
 * Global istemci sağlayıcıları tek yerde (coding-standards: global kaynağa tek abonelik).
 * next-themes `<html>`'e sınıfı boyamadan önce çalışan satır içi script ile koyar → flash yok.
 * Varsayılan koyu; kullanıcı "Sistem"i seçebilir.
 */
export const Providers = ({ children }: { children: ReactNode }): ReactElement => (
  <ThemeProvider
    attribute='class'
    defaultTheme='dark'
    enableSystem
    disableTransitionOnChange
    storageKey={THEME_STORAGE_KEY}
  >
    <TooltipProvider>
      {children}
      <Toaster />
    </TooltipProvider>
  </ThemeProvider>
);
