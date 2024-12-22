'use client';

import { useTranslations } from 'next-intl';

const Home = (): React.ReactNode => {
  const t = useTranslations('HomePage');

  return <div>{t('title')}</div>;
};

export default Home;
