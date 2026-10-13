'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactElement, type ReactNode, useEffect, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ErrorCode, errorMessageKey } from '@/lib/errors';
import { PRIVACY_NOTICE_HREF, TERMS_HREF } from '@/lib/legal/versions';
import { normalizeUsernameInput, usernameIssue } from '@/lib/users/username';

import { onboardingSchema } from '../schemas';
import { checkUsernameAvailability, completeOnboarding } from '../server/actions';

import { EmailConflictNotice } from './email-conflict-notice';
import { CheckboxField, FieldError, FormAlert, TextField } from './form-parts';

type FormInput = z.input<typeof onboardingSchema>;
type FormOutput = z.output<typeof onboardingSchema>;
type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid';
type Checked = { readonly username: string; readonly availability: Availability };

const CHECK_DELAY_MS = 400;

/** Etiket içindeki yasal metin bağlantısı (yeni sekme: form doldurulurken kaybolmasın). */
const legalLink = (href: string, chunks: ReactNode): ReactElement => (
  <Link
    href={href}
    target='_blank'
    className='font-medium text-accent underline underline-offset-2'
  >
    {chunks}
  </Link>
);

type OnboardingFormProps = {
  /** Oturumdaki kimliğin e-postası (yalnızca sahibine; çakışma mesajında gösterilir). */
  email: string;
  suggestedDisplayName: string | null;
  next: string | null;
  /** `MARKETING_CONSENT_ENABLED` (sunucuda okunur). Kapalıyken pazarlama kutusu hiç render edilmez. */
  marketingEnabled: boolean;
};

/**
 * Onboarding: kullanıcı adı (kural + rezerve + canlı müsaitlik), görünen ad ve sırasıyla
 * (docs/legal/auth-metinleri.md): 18+ beyanı → Kullanım Koşulları kabulü (zorunlu) →
 * aydınlatma metninin okunup anlaşıldığı (rıza değil) → ayraç → ayrı, işaretsiz pazarlama izni
 * (yalnızca flag açıkken).
 */
export const OnboardingForm = ({
  email,
  suggestedDisplayName,
  next,
  marketingEnabled,
}: OnboardingFormProps): ReactElement => {
  const t = useTranslations('auth.onboarding');
  const tRoot = useTranslations();
  const [serverError, setServerError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [emailConflict, setEmailConflict] = useState(false);
  const [submitting, startSubmit] = useTransition();

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      username: '',
      displayName: suggestedDisplayName ?? '',
      ageConfirmed: false,
      termsAccepted: false,
      noticeAcknowledged: false,
      marketingOptIn: false,
      next,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const rawUsername = useWatch({ control: form.control, name: 'username' });

  const username = normalizeUsernameInput(rawUsername ?? '');
  const checkable = username !== '' && usernameIssue(username) === null;
  // Sonuç yazıldığı ada bağlı: kullanıcı yazmaya devam ederse eski sonuç gösterilmez
  const availability: Availability = !checkable
    ? 'idle'
    : checked?.username === username
      ? checked.availability
      : 'checking';

  useEffect(() => {
    if (!checkable) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      void checkUsernameAvailability({ username }).then(result => {
        if (cancelled) return;
        setChecked({ username, availability: result.ok ? result.data.availability : 'idle' });
      });
    }, CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkable, username]);

  const onSubmit = form.handleSubmit(values =>
    startSubmit(async () => {
      setServerError(null);
      // Başarıda sunucu yönlendirir; buraya yalnızca hata dönerse gelinir
      const result = await completeOnboarding(values);
      if (result.ok) return;
      if (result.error === ErrorCode.USERNAME_TAKEN) {
        setChecked({ username: values.username, availability: 'taken' });
        form.setError('username', { message: 'taken' }, { shouldFocus: true });
        return;
      }
      if (result.error === ErrorCode.ACCOUNT_EMAIL_CONFLICT) {
        setEmailConflict(true);
        return;
      }
      if (result.error === ErrorCode.USERNAME_RESERVED) {
        form.setError('username', { message: 'reserved' }, { shouldFocus: true });
        return;
      }
      setServerError(
        result.error === ErrorCode.VALIDATION || result.error === ErrorCode.INTERNAL
          ? t('failed')
          : tRoot(errorMessageKey(result.error))
      );
    })
  );

  const busy = submitting || isSubmitting;
  const usernameError = errors.username?.message
    ? t(`username.errors.${errors.username.message as 'taken'}`)
    : availability === 'taken' || availability === 'reserved'
      ? t(`username.errors.${availability}`)
      : null;

  const usernameStatus: ReactNode =
    availability === 'checking' ? (
      <span className='inline-flex items-center gap-2'>
        <LoaderCircle aria-hidden='true' className='size-4 animate-spin' />
        {t('username.checking')}
      </span>
    ) : availability === 'available' && !errors.username ? (
      <span className='inline-flex items-center gap-2 text-success'>
        <CircleCheck aria-hidden='true' className='size-4' />
        {t('username.available')}
      </span>
    ) : null;

  if (emailConflict) return <EmailConflictNotice email={email} />;

  return (
    <form noValidate onSubmit={event => void onSubmit(event)} className='flex flex-col gap-5'>
      {serverError ? <FormAlert>{serverError}</FormAlert> : null}

      <TextField
        id='onboarding-username'
        label={t('username.label')}
        autoComplete='username'
        autoCapitalize='none'
        autoCorrect='off'
        spellCheck={false}
        maxLength={20}
        hint={
          <span className='flex flex-col gap-1'>
            <span>{t('username.hint')}</span>
            <span aria-live='polite'>{usernameStatus}</span>
          </span>
        }
        error={usernameError}
        readOnly={busy}
        {...form.register('username')}
      />
      <TextField
        id='onboarding-display-name'
        label={t('displayName.label')}
        autoComplete='name'
        maxLength={50}
        hint={t('displayName.hint')}
        error={
          errors.displayName?.message
            ? t(`displayName.errors.${errors.displayName.message as 'required'}`)
            : null
        }
        readOnly={busy}
        {...form.register('displayName')}
      />

      {/* Gönderim sürerken onaylar değiştirilemez (gönderilen değerle ekrandaki aynı kalsın) */}
      <fieldset disabled={busy} className='flex flex-col gap-1'>
        <CheckboxField
          id='onboarding-age'
          label={t('age.label')}
          error={errors.ageConfirmed ? t('age.required') : null}
          {...form.register('ageConfirmed')}
        />
        <CheckboxField
          id='onboarding-terms'
          label={t.rich('terms.label', { link: chunks => legalLink(TERMS_HREF, chunks) })}
          error={errors.termsAccepted ? t('terms.required') : null}
          {...form.register('termsAccepted')}
        />
        <CheckboxField
          id='onboarding-notice'
          label={t.rich('notice.label', {
            link: chunks => legalLink(PRIVACY_NOTICE_HREF, chunks),
          })}
          error={errors.noticeAcknowledged ? t('notice.required') : null}
          {...form.register('noticeAcknowledged')}
        />
        {marketingEnabled ? (
          <>
            {/* Aydınlatma ile açık rıza ayrı beyanlar (KVK Kurulu 2026/347): görsel ayraç */}
            <hr className='my-2 border-border' />
            <CheckboxField
              id='onboarding-marketing'
              label={t('marketing.label')}
              hint={t('marketing.hint')}
              {...form.register('marketingOptIn')}
            />
          </>
        ) : null}
      </fieldset>

      {errors.next ? <FieldError>{t('failed')}</FieldError> : null}

      <Button
        type='submit'
        data-testid='onboarding-submit'
        loading={busy}
        disabled={busy}
        className='w-full'
      >
        {busy ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
};
