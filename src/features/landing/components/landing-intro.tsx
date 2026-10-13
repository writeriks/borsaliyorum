import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

/** Geçici karşılama metni; landing tasarımı S2/S11'de gelecek. */
export const LandingIntro = (): ReactElement => {
  const t = useTranslations('home');

  return (
    <header className='flex flex-col gap-3'>
      <h1 className='text-2xl font-bold tracking-tight'>{t('title')}</h1>
      <p className='text-md text-fg-muted'>{t('lead')}</p>
    </header>
  );
};
