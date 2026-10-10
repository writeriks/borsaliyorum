'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import type { ComposerProps } from './composer';

/**
 * Kapalı composer ile aynı ölçüde yer tutucu (CLS yok, [AUTH-02]). "Giriş yap" asla burada
 * görünmez: auth `unknown` iken de bu skeleton kullanılır (auth-session).
 */
export const ComposerSkeleton = ({ className }: { className?: string }): ReactElement => {
  const t = useTranslations('composer');
  return (
    <div
      aria-busy='true'
      data-testid='composer-skeleton'
      className={cn(
        'flex min-h-17 flex-col justify-center gap-2 rounded-lg border border-border bg-bg-subtle p-3',
        className
      )}
    >
      <span className='sr-only'>{t('loading')}</span>
      <Skeleton className='h-5 w-1/2' />
      <Skeleton className='h-3 w-3/4' />
    </div>
  );
};

/**
 * TipTap/ProseMirror büyük: composer ayrı chunk olarak, yalnızca istemcide yüklenir
 * (ADR-0002 Karar 3, bütçe ≤ 120 KB gz).
 */
export const ComposerLazy = dynamic<ComposerProps>(
  () => import('./composer').then(mod => mod.Composer),
  { ssr: false, loading: () => <ComposerSkeleton /> }
);

export type ComposerViewer =
  { status: 'unknown' } | { status: 'anonymous' } | { status: 'authenticated'; userId: number };

type ComposerGateProps = {
  viewer: ComposerViewer;
  mode: ComposerProps['mode'];
  loginHref?: string;
  signupHref?: string;
  children: (userId: number) => ReactElement;
};

/**
 * Auth durumuna göre composer alanı (tasarım §1.9): `unknown` → skeleton (asla "Giriş yap"),
 * `anonymous` → giriş çağrısı, `authenticated` → composer.
 */
export const ComposerGate = ({
  viewer,
  mode,
  loginHref = '/giris',
  signupHref = '/kayit',
  children,
}: ComposerGateProps): ReactElement => {
  const t = useTranslations();
  if (viewer.status === 'unknown') return <ComposerSkeleton />;
  if (viewer.status === 'authenticated') return children(viewer.userId);
  return (
    <div className='flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-subtle p-3'>
      <p className='flex-1 text-sm text-fg-muted'>
        {t(mode === 'post' ? 'composer.anon.post' : 'composer.anon.comment')}
      </p>
      <Button asChild size='lg'>
        <Link href={loginHref}>{t('common.login')}</Link>
      </Button>
      <Button asChild variant='outline' size='lg'>
        <Link href={signupHref}>{t('common.signup')}</Link>
      </Button>
    </div>
  );
};
