'use client';

import firebaseAuthService from '@/services/firebase-service/firebase-auth-service';

import { useEffect } from 'react';

const Home = (): React.ReactNode => {
  useEffect(() => {
    const handleCookieCheck = async (): Promise<void> => {
      const cookie = document.cookie.replace(/(?:(?:^|.*;\s*)identity\s*=\s*([^;]*).*$)|^.*$/, '');
      if (!document.cookie || cookie === '') {
        await firebaseAuthService.signOut();
      }
    };
    handleCookieCheck();
  }, []);

  return <div>Home Page, show around 10 posts for the most active stocks of the day</div>;
};

export default Home;
