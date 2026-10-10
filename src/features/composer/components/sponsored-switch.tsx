'use client';

import { useTranslations } from 'next-intl';
import { Switch } from 'radix-ui';
import { type ReactElement, useId } from 'react';

import { cn } from '@/lib/utils';

type SponsoredSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

/**
 * Reklam/işbirliği beyanı (legal HD-2, tasarım §1.6b): gönderi varyantlarında her zaman görünür,
 * varsayılan kapalı, önceki gönderiden hatırlanmaz. Erişilebilir ad etiket metnidir ([LEG-02]).
 */
export const SponsoredSwitch = ({
  checked,
  onCheckedChange,
  disabled = false,
}: SponsoredSwitchProps): ReactElement => {
  const t = useTranslations('composer.sponsored');
  const labelId = useId();
  const helpId = useId();

  return (
    <div className='flex items-start justify-between gap-3'>
      <div className='flex min-w-0 flex-col gap-0.5'>
        <span id={labelId} className='text-sm text-fg'>
          {t('label')}
        </span>
        <span id={helpId} className='text-xs text-fg-subtle'>
          {t('help')}
        </span>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={helpId}
        className={cn(
          // Görünür 24 px; dokunma alanı 44 px
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border-strong bg-bg-muted transition-colors',
          'before:absolute before:-inset-2.5 before:content-[""]',
          'disabled:opacity-60 data-[state=checked]:border-accent data-[state=checked]:bg-accent'
        )}
      >
        <Switch.Thumb
          className={cn(
            'block size-4.5 translate-x-0.5 rounded-full bg-fg-muted shadow-sm transition-transform',
            'data-[state=checked]:translate-x-5.5 data-[state=checked]:bg-accent-fg'
          )}
        />
      </Switch.Root>
    </div>
  );
};

/** Yayında görünecek etiketin önizlemesi ([LEG-03]); kart S6'da aynı metni yazar adından önce koyar. */
export const SponsoredPreview = (): ReactElement => {
  const t = useTranslations('composer.sponsored');
  return (
    <span className='inline-flex self-start rounded-sm border border-border-strong bg-bg-muted px-2 py-0.5 text-xs font-medium text-fg'>
      {t('preview')}
    </span>
  );
};
