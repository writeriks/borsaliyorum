'use client';

import { useTheme } from 'next-themes';
import type { CSSProperties, ReactElement } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Uygulamada tek Toaster (Providers). Tema next-themes'ten okunur; renkler token'lardan.
 * Mobilde alt tab bar'ın (56px + safe area) üstünde kalır.
 */
export const Toaster = (props: ToasterProps): ReactElement => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position='bottom-center'
      mobileOffset={{ bottom: 'calc(56px + 16px + env(safe-area-inset-bottom))' }}
      style={
        {
          '--normal-bg': 'hsl(var(--bg-elevated))',
          '--normal-text': 'hsl(var(--fg))',
          '--normal-border': 'hsl(var(--border))',
          zIndex: 70,
        } as CSSProperties
      }
      {...props}
    />
  );
};
