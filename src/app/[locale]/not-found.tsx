import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Link } from '@/i18n/navigation';

const NotFound = (): ReactElement => {
  const t = useTranslations('notFound');

  return (
    <main className='mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16'>
      <h1 className='text-2xl font-semibold'>{t('title')}</h1>
      <p>{t('description')}</p>
      <Link href='/' className='inline-flex min-h-11 items-center self-start underline'>
        {t('backHome')}
      </Link>
    </main>
  );
};

export default NotFound;
