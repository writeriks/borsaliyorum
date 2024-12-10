import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import React from 'react';

interface LoginContainerProps {
  setLoginModalOpen: () => void;
}

const LoginContainer: React.FC<LoginContainerProps> = ({ setLoginModalOpen }) => {
  const t = useTranslations('userProfileOptions.LoginContainer');

  return (
    <div className='flex flex-col w-full h-full justify-center items-center'>
      <Button
        className='w-48 m-1 text-lg font-medium bg-bluePrimary rounded-full text-white'
        onClick={() => setLoginModalOpen()}
      >
        {t('login')}
      </Button>
    </div>
  );
};

export default LoginContainer;
