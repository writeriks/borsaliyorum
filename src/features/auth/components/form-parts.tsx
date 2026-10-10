'use client';

import { CircleAlert } from 'lucide-react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TextFieldProps = Omit<ComponentProps<typeof Input>, 'id'> & {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
};

/** Etiket + girdi + ipucu + hata; hata `aria-describedby` ile girdiye bağlı. */
export const TextField = ({ id, label, hint, error, ...props }: TextFieldProps): ReactElement => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className='flex flex-col gap-2'>
      <label htmlFor={id} className='text-sm font-medium text-fg'>
        {label}
      </label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...props}
      />
      {hint ? (
        <div id={hintId} className='text-xs text-fg-muted'>
          {hint}
        </div>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
};

export const FieldError = ({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}): ReactElement => (
  <p id={id} className='flex items-start gap-2 text-xs text-danger'>
    <CircleAlert aria-hidden='true' className='mt-px size-4 shrink-0' />
    <span>{children}</span>
  </p>
);

/** Form düzeyindeki hata (ör. "E-posta veya şifre hatalı."): ekran okuyucuya anında duyurulur. */
export const FormAlert = ({ children }: { children: ReactNode }): ReactElement => (
  <div
    role='alert'
    data-testid='auth-form-error'
    className='flex items-start gap-2 rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm text-fg'
  >
    <CircleAlert aria-hidden='true' className='mt-1 size-4 shrink-0 text-danger' />
    <span>{children}</span>
  </div>
);

type CheckboxFieldProps = Omit<ComponentProps<'input'>, 'type' | 'id'> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
};

/** Yerel checkbox (erişilebilir, ≥44px dokunma alanı etiketle birlikte). */
export const CheckboxField = ({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: CheckboxFieldProps): ReactElement => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className='flex min-h-hit items-start gap-3'>
        <input
          id={id}
          type='checkbox'
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          className='mt-3 size-5 shrink-0 cursor-pointer accent-accent'
          {...props}
        />
        <label htmlFor={id} className='cursor-pointer py-3 text-sm text-fg'>
          {label}
        </label>
      </div>
      {hint ? (
        <p id={hintId} className='pl-8 text-xs text-fg-muted'>
          {hint}
        </p>
      ) : null}
      {error ? (
        <div className='pl-8'>
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      ) : null}
    </div>
  );
};
