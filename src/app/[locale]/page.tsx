'use client';

import firebaseAuthService from '@/services/firebase-service/firebase-auth-service';
import { useTranslations } from 'next-intl';

import { useEffect } from 'react';

const Home = (): React.ReactNode => {
  const t = useTranslations('HomePage');

  useEffect(() => {
    const handleCookieCheck = async (): Promise<void> => {
      const cookie = document.cookie.replace(/(?:(?:^|.*;\s*)identity\s*=\s*([^;]*).*$)|^.*$/, '');
      if (!document.cookie || cookie === '') {
        await firebaseAuthService.signOut();
      }
    };
    handleCookieCheck();
  }, []);

  return <div> {t('title')}</div>;
};

export default Home;
