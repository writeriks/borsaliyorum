import { Button } from '@/components/ui/button';
import React from 'react';

interface LoginContainerProps {
  setLoginModalOpen: () => void;
}

const LoginContainer: React.FC<LoginContainerProps> = ({ setLoginModalOpen }) => (
  <div className='flex flex-col w-full h-full justify-center items-center'>
    <Button
      className='w-48 m-1 text-lg font-medium bg-blue-600 rounded-full text-white'
      onClick={() => setLoginModalOpen()}
    >
      Giriş Yap
    </Button>
  </div>
);

export default LoginContainer;
