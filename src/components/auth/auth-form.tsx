'use client';

import { useState } from 'react';
import { z } from 'zod';

import { LoginForm } from '@/components/auth/login-form';
import { LoginWithProviders } from '@/components/auth/login-with-provider';
import { RegisterForm } from '@/components/auth/register-form';
import { loginFormSchema, registerFormSchema } from '@/components/auth/auth-service/common-auth';
import firebaseAuthService from '@/services/firebase-service/firebase-auth-service';
import { ResetPassword } from '@/components/auth/reset-password';

enum FormType {
  LOGIN = 'login',
  REGISTER = 'register',
  RESET_PASSWORD = 'resetPassword',
}

export const AuthForm = (): React.ReactNode => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formType, setFormType] = useState<FormType>(FormType.LOGIN);

  const onSubmit = async (
    values: z.infer<typeof loginFormSchema & typeof registerFormSchema>
  ): Promise<void> => {
    console.log(values);
    setIsLoading(true);

    if (formType === FormType.LOGIN) {
      await firebaseAuthService.signInWithEmailAndPassword(values.email, values.password);
    } else if (formType === FormType.REGISTER) {
      const isUserAdded = await firebaseAuthService.signUpWithEmailAndPassword(
        values.username,
        values.displayName,
        values.email,
        values.password
      );
      if (isUserAdded) {
        setFormType(FormType.LOGIN);
      }
    } else {
      await firebaseAuthService.sendPasswordResetEmail(values.email);
    }

    setIsLoading(false);
  };

  const renderFormScreen = (): React.ReactNode => {
    switch (formType) {
      case FormType.RESET_PASSWORD:
        return (
          <ResetPassword
            onLoginClick={() => setFormType(FormType.LOGIN)}
            onSubmit={onSubmit}
            isLoading={isLoading}
          />
        );

      case FormType.REGISTER:
        return (
          <RegisterForm
            onLoginClick={() => setFormType(FormType.LOGIN)}
            onSubmit={onSubmit}
            isLoading={isLoading}
          />
        );

      default:
        return (
          <LoginForm
            onRegisterClick={() => setFormType(FormType.REGISTER)}
            onResetPasswordClick={() => setFormType(FormType.RESET_PASSWORD)}
            onSubmit={onSubmit}
            isLoading={isLoading}
          />
        );
    }
  };

  return (
    <div className='grid gap-4'>
      {renderFormScreen()}
      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-background px-2 text-muted-foreground'>veya</span>
        </div>
      </div>
      <LoginWithProviders isLoading={isLoading} />
    </div>
  );
};
