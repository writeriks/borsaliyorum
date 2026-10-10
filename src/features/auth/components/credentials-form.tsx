'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactElement, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { prefetchCsrfToken } from '@/lib/auth/session-api';

import {
  type AuthFlowResult,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../client/auth-flows';
import type { AuthErrorKey } from '../firebase-errors';
import { loginSchema, signupSchema } from '../schemas';

import { FormAlert, TextField } from './form-parts';
import { GoogleIcon } from './google-icon';
import { useFinishSignIn } from './use-finish-sign-in';

type Mode = 'login' | 'signup';
type Busy = 'email' | 'google' | null;
type Values = { email: string; password: string };

type CredentialsFormProps = {
  mode: Mode;
  /** Girişten sonra dönülecek yol (sunucuda `safeNextPath` ile süzülmüş). */
  next: string | null;
};

/**
 * Giriş ve kayıt formu (e-posta + şifre, Google). Butona basıldığı an buton devre dışı +
 * spinner + "Giriş yapılıyor…" (Google popup'ı açıkken de); başarıda navigasyon bitene kadar
 * bu durum korunur (auth-session UX kuralı 2). Hata mesajı alan belirtmez.
 */
export const CredentialsForm = ({ mode, next }: CredentialsFormProps): ReactElement => {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { setPending } = useAuth();
  const finish = useFinishSignIn(next);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<AuthErrorKey | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(mode === 'login' ? loginSchema : signupSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    prefetchCsrfToken();
  }, []);

  const run = async (kind: Exclude<Busy, null>, flow: () => Promise<AuthFlowResult>) => {
    setBusy(kind);
    setPending('signing-in');
    setError(null);
    const result = await flow();
    if (result.ok) {
      // Navigasyon tamamlanana kadar buton yüklenme durumunda kalır
      finish(result.session);
      return;
    }
    setPending(null);
    setBusy(null);
    setError(result.error);
  };

  const onSubmit = form.handleSubmit(values =>
    run('email', () =>
      mode === 'login'
        ? signInWithEmail(locale, values.email, values.password)
        : signUpWithEmail(locale, values.email, values.password)
    )
  );

  const emailBusy = busy === 'email' || (isSubmitting && busy === null);
  const anyBusy = busy !== null || isSubmitting;
  const fieldError = (key: string | undefined): string | null =>
    key ? t(`validation.${key as 'emailInvalid'}`) : null;

  return (
    <div className='flex flex-col gap-5'>
      {error ? <FormAlert>{t(`errors.${error}`)}</FormAlert> : null}

      <form noValidate onSubmit={event => void onSubmit(event)} className='flex flex-col gap-4'>
        <TextField
          id={`${mode}-email`}
          type='email'
          autoComplete='email'
          inputMode='email'
          label={t('fields.email')}
          error={fieldError(errors.email?.message)}
          readOnly={anyBusy}
          {...form.register('email')}
        />
        <TextField
          id={`${mode}-password`}
          type='password'
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          label={t('fields.password')}
          hint={mode === 'signup' ? t('fields.passwordHint') : undefined}
          error={fieldError(errors.password?.message)}
          readOnly={anyBusy}
          {...form.register('password')}
        />
        <Button
          type='submit'
          data-testid='auth-submit'
          loading={emailBusy}
          disabled={anyBusy}
          className='w-full'
        >
          {emailBusy ? t(`${mode}.submitting`) : t(`${mode}.submit`)}
        </Button>
      </form>

      <div className='flex items-center gap-3 text-xs text-fg-subtle'>
        <span aria-hidden='true' className='h-px flex-1 bg-border' />
        <span>{t('or')}</span>
        <span aria-hidden='true' className='h-px flex-1 bg-border' />
      </div>

      <Button
        type='button'
        variant='outline'
        data-testid='auth-google'
        loading={busy === 'google'}
        disabled={anyBusy}
        onClick={() => void run('google', () => signInWithGoogle(locale))}
        className='w-full'
      >
        {busy === 'google' ? null : <GoogleIcon />}
        {busy === 'google' ? t('google.pending') : t('google.action')}
      </Button>
    </div>
  );
};
