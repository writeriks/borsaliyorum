'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export const THEMES = ['dark', 'light', 'system'] as const;
export type ThemeChoice = (typeof THEMES)[number];

const ICONS = { dark: Moon, light: Sun, system: Monitor } as const;

type ThemeToggleProps = {
  /** xl etiketli menüde ikon yanında "Tema" yazısı */
  withLabel?: boolean;
  align?: 'start' | 'end';
  className?: string;
};

/**
 * Tetikleyici ikonu CSS ile seçilir (`dark:`): sunucu kullanıcının temasını bilmez, JS ile
 * seçilseydi hidrasyon sonrası ikon değişir (flash). Tercih next-themes ile localStorage'da.
 */
export const ThemeToggle = ({
  withLabel = false,
  align = 'end',
  className,
}: ThemeToggleProps): ReactElement => {
  const t = useTranslations('theme');
  const { theme, setTheme } = useTheme();

  return (
    // Modal değil: modal menü kardeşlere aria-hidden koyar ama odaklanabilirlikleri kalır (axe aria-hidden-focus)
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size={withLabel ? 'lg' : 'icon'}
          aria-label={t('toggle')}
          className={cn(
            withLabel && 'xl:justify-start xl:gap-4 xl:rounded-full xl:px-3',
            className
          )}
          data-testid='theme-toggle'
        >
          <Moon aria-hidden='true' className='hidden dark:block' />
          <Sun aria-hidden='true' className='dark:hidden' />
          {withLabel ? (
            <span aria-hidden='true' className='hidden text-md font-normal xl:inline'>
              {t('menuLabel')}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel>{t('menuLabel')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={value => setTheme(value)}>
          {THEMES.map(choice => {
            const Icon = ICONS[choice];
            return (
              <DropdownMenuRadioItem key={choice} value={choice}>
                <Icon aria-hidden='true' />
                {t(choice)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
