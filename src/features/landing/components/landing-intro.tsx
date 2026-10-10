import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

/** Geçici karşılama metni; landing tasarımı S2/S11'de gelecek. */
export const LandingIntro = (): ReactElement => {
  const t = useTranslations('home');

  return (
    <header className='flex flex-col gap-3'>
      <h1 className='text-3xl font-semibold'>{t('title')}</h1>
      <p className='text-base leading-normal'>{t('lead')}</p>
    </header>
  );
};
