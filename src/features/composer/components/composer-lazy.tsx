'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Fragment, type ReactElement, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { SIGNED_OUT_EVENT } from '@/lib/auth-events';
import { cn } from '@/lib/utils';

import { clearAllDrafts } from '../lib/draft-storage';

import type { ComposerProps } from './composer';

/**
 * Kapalı (inline, gönderi) composer ile aynı ölçüde yer tutucu (CLS yok, [AUTH-02]); yükseklik 86 px
 * (mobil: 24 px editör satırı + 32 px uyarı + dolgu) ve composer değişince birlikte güncellenir. "Giriş yap" asla burada
 * görünmez: auth `unknown` iken de bu skeleton kullanılır (auth-session). `reason='chunk'`:
 * yalnızca lazy chunk yüklemesi (auth biliniyor); `data-skeleton='chunk'` ile işaretlenir ki
 * auth flash testi bunu auth iskeletinden ayırabilsin.
 */
export const ComposerSkeleton = ({
  className,
  reason = 'auth',
}: {
  className?: string;
  reason?: 'auth' | 'chunk';
}): ReactElement => {
  const t = useTranslations('composer');
  return (
    <div
      aria-busy='true'
      data-testid='composer-skeleton'
      data-skeleton={reason === 'chunk' ? 'chunk' : undefined}
      className={cn(
        'flex min-h-21.5 flex-col justify-center gap-2 rounded-lg border border-border bg-bg-subtle p-3',
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
  { ssr: false, loading: () => <ComposerSkeleton reason='chunk' /> }
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
  // [DRF-04] Paylaşılan cihazda sonraki kullanıcı taslakları görmesin: S5 çıkışta olayı yayınlar
  useEffect(() => {
    const onSignedOut = (): void => clearAllDrafts();
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
  }, []);
  if (viewer.status === 'unknown') return <ComposerSkeleton />;
  if (viewer.status === 'authenticated') {
    // Kullanıcı değişirse composer sıfırdan kurulur: önceki kullanıcının metni/taslak anahtarı taşınmaz
    return <Fragment key={viewer.userId}>{children(viewer.userId)}</Fragment>;
  }
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
