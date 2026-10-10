'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { User } from 'firebase/auth';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { prewarmClientAuth } from '@/lib/auth/firebase-client';
import { prefetchCsrfToken } from '@/lib/auth/session-api';
import { ErrorCode } from '@/lib/errors';

import {
  type AfterAuthenticate,
  type AuthFlowResult,
  completeGoogleRedirect,
  hasPendingGoogleRedirect,
  sendVerificationEmail,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../client/auth-flows';
import { AuthErrorKey } from '../firebase-errors';
import { loginSchema, signupSchema } from '../schemas';
import { authorizeVerificationEmail } from '../server/actions';

import { FormAlert, TextField } from './form-parts';
import { GoogleIcon } from './google-icon';
import { useFinishSignIn } from './use-finish-sign-in';

/** `reverify`: girişli ama e-postası doğrulanmamış kullanıcı, doğrulama bağlantısı için. */
export type CredentialsMode = 'login' | 'signup' | 'reverify';
type Busy = 'email' | 'google' | null;
type Values = { email: string; password: string };
type VerificationOutcome = 'sent' | 'already' | 'rate-limited' | 'failed';

type CredentialsFormProps = {
  mode: CredentialsMode;
  /** Girişten sonra dönülecek yol (sunucuda `safeNextPath` ile süzülmüş). */
  next: string | null;
};

const OUTCOME_TOAST = {
  sent: { kind: 'success', key: 'verify.resent' },
  already: { kind: 'success', key: 'verify.verified' },
  'rate-limited': { kind: 'error', key: 'verify.resendRateLimited' },
  failed: { kind: 'error', key: 'verify.resendFailed' },
} as const;

/** Yeniden girişte: izin (hesap başına rate limit) al, doğrulama bağlantısını gönder. */
const sendVerificationAfterReauth = async (user: User): Promise<VerificationOutcome> => {
  if (user.emailVerified) return 'already';
  const allowed = await authorizeVerificationEmail();
  if (!allowed.ok) return allowed.error === ErrorCode.RATE_LIMITED ? 'rate-limited' : 'failed';
  return sendVerificationEmail(user).then(
    () => 'sent' as const,
    () => 'failed' as const
  );
};

/**
 * Giriş, kayıt ve "tekrar giriş yap ve doğrulama bağlantısını gönder" formu (e-posta + şifre,
 * Google). Butona basıldığı an buton devre dışı + spinner + "Giriş yapılıyor…" (Google popup'ı
 * açıkken de); başarıda navigasyon bitene kadar bu durum korunur (auth-session UX kuralı 2).
 * Hata mesajı alan belirtmez.
 */
export const CredentialsForm = ({ mode, next }: CredentialsFormProps): ReactElement => {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { setPending } = useAuth();
  const finish = useFinishSignIn(next);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(mode === 'signup' ? signupSchema : loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });
  const { errors, isSubmitting } = form.formState;

  const run = useCallback(
    async (
      kind: Exclude<Busy, null>,
      flow: (afterReauth?: AfterAuthenticate) => Promise<AuthFlowResult>
    ): Promise<void> => {
      setBusy(kind);
      setPending('signing-in');
      setError(null);
      // Yeniden giriş (reverify): istemci oturumu bu anda açıkken izin al ve bağlantıyı gönder
      let outcome: VerificationOutcome | null = null;
      const afterReauth: AfterAuthenticate | undefined =
        mode === 'reverify'
          ? async user => {
              outcome = await sendVerificationAfterReauth(user);
            }
          : undefined;
      const result = await flow(afterReauth);
      if (result.ok) {
        if (outcome) {
          const { kind: toastKind, key } = OUTCOME_TOAST[outcome];
          if (toastKind === 'success') toast.success(t(key));
          else toast.error(t(key));
        }
        // Navigasyon tamamlanana kadar buton yüklenme durumunda kalır; pending form
        // kaldırılınca (unmount) temizlenir
        finish(result.session);
        return;
      }
      setPending(null);
      setBusy(null);
      setError(result.error);
    },
    [finish, mode, setPending, t]
  );

  useEffect(() => {
    // İkisi de idempotent (önbellekli)
    prefetchCsrfToken();
    // Google popup'ı tıklamada senkron açılabilsin diye SDK önceden yüklenir
    prewarmClientAuth(locale);
    if (!hasPendingGoogleRedirect()) return undefined;
    // Redirect dönüşü: işaret `completeGoogleRedirect` başlayınca silinir, tek sefer çalışır.
    // Zamanlayıcı: effect içinde senkron setState yapılmasın.
    const timer = setTimeout(() => void run('google', () => completeGoogleRedirect(locale)), 0);
    return () => clearTimeout(timer);
  }, [locale, run]);

  // Başarılı girişten sonra sayfa değişince "signing-in" durumu kalıcı olmasın
  useEffect(() => () => setPending(null), [setPending]);

  const onSubmit = form.handleSubmit(values =>
    run('email', afterReauth =>
      mode === 'signup'
        ? signUpWithEmail(locale, values.email, values.password)
        : signInWithEmail(locale, values.email, values.password, afterReauth)
    )
  );

  const emailBusy = busy === 'email' || (isSubmitting && busy === null);
  const anyBusy = busy !== null || isSubmitting;
  const fieldError = (key: string | undefined): string | null =>
    key ? t(`validation.${key as 'emailInvalid'}`) : null;
  const errorText = (key: AuthErrorKey): string =>
    mode === 'signup' && key === AuthErrorKey.GENERIC
      ? t('errors.signupGeneric')
      : t(`errors.${key}`);

  return (
    <div className='flex flex-col gap-5'>
      {error ? <FormAlert>{errorText(error)}</FormAlert> : null}

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
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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
        // `run` → `signInWithGoogle` senkron başlar: popup bu tıklamanın içinde açılır
        onClick={() => void run('google', afterReauth => signInWithGoogle(locale, afterReauth))}
        className='w-full'
      >
        {busy === 'google' ? null : <GoogleIcon />}
        {busy === 'google' ? t('google.pending') : t('google.action')}
      </Button>
    </div>
  );
};
