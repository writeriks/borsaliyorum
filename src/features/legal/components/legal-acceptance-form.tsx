'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { type ReactElement, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { CheckboxField, FormAlert } from '@/features/auth/components/form-parts';
import { useActionResult } from '@/lib/client/action-result';
import { ErrorCode, errorMessageKey } from '@/lib/errors';

import { legalAcceptanceSchema } from '../schemas';
import { acceptLegalUpdate } from '../server/actions';

type FormInput = z.input<typeof legalAcceptanceSchema>;
type FormOutput = z.output<typeof legalAcceptanceSchema>;

/**
 * Yeni sürüm kabul formu: tek, işaretsiz, zorunlu kutu + "Kabul et ve devam et". Başarıda sunucu
 * `next`'e yönlendirir; oturum düşmesi ortak action-result işleyicisiyle (girişe dönüş).
 */
export const LegalAcceptanceForm = ({ next }: { next: string | null }): ReactElement => {
  const t = useTranslations('legalUpdate');
  const tRoot = useTranslations();
  const handleResult = useActionResult();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(legalAcceptanceSchema),
    defaultValues: { accepted: false, next },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(values =>
    startSubmit(async () => {
      setServerError(null);
      const result = await acceptLegalUpdate(values);
      if (result.ok) return;
      if (result.error === ErrorCode.UNAUTHENTICATED) {
        handleResult(result);
        return;
      }
      setServerError(tRoot(errorMessageKey(result.error)));
    })
  );

  const busy = submitting || isSubmitting;

  return (
    <form noValidate onSubmit={event => void onSubmit(event)} className='flex flex-col gap-4'>
      {serverError ? <FormAlert>{serverError}</FormAlert> : null}
      <fieldset disabled={busy}>
        <CheckboxField
          id='legal-accept'
          label={t('checkbox')}
          error={errors.accepted ? t('checkboxRequired') : null}
          {...form.register('accepted')}
        />
      </fieldset>
      <Button
        type='submit'
        data-testid='legal-accept-submit'
        loading={busy}
        disabled={busy}
        className='w-full sm:w-auto sm:self-start'
      >
        {busy ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
};
