'use client';

import { useTheme } from 'next-themes';
import type { CSSProperties, ReactElement } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { cn } from '@/lib/utils';

/**
 * Alt boşluk tek CSS değişkeninden okunur, kesme noktasını Tailwind belirler: sonner'ın kendi
 * `mobileOffset`'i yalnızca ≤600px'te devreye girer, oysa tab bar md (768px) altında görünür.
 * 601–767px aralığında toast tab bar'ın üstüne binmesin diye iki offset de aynı değişkene bağlı.
 * md ve üstünde sonner'ın varsayılanı (24px).
 */
const BOTTOM_OFFSET = 'var(--toast-offset-bottom)';
const offsetClasses =
  '[--toast-offset-bottom:calc(var(--spacing-tabbar)_+_16px_+_env(safe-area-inset-bottom))] md:[--toast-offset-bottom:24px]';

/** Uygulamada tek Toaster (Providers). Tema next-themes'ten okunur; renkler token'lardan. */
export const Toaster = ({ className, ...props }: ToasterProps): ReactElement => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position='bottom-center'
      offset={{ bottom: BOTTOM_OFFSET }}
      mobileOffset={{ bottom: BOTTOM_OFFSET }}
      className={cn(offsetClasses, className)}
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
