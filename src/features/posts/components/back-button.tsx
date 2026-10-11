'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { consumeInAppNavigation } from '@/lib/client/in-app-navigation';

/**
 * Geçmişte geri gitmek siteyi terk ettirmez mi? Navigation API'nin `canGoBack`'i yalnızca aynı
 * origin'deki önceki girdiyi sayar: akıştan, profil ya da yasal sayfadan (istemci geçişi ya da
 * tam yükleme) gelindiyse true; aramadan/başka siteden doğrudan açılan linkte false. API'siz
 * tarayıcıda yalnızca bu belgede karttan yapılan geçişe güvenilir (`markInAppNavigation`).
 */
export const canGoBackInApp = (): boolean => {
  if ('navigation' in window && typeof window.navigation?.canGoBack === 'boolean') {
    return window.navigation.canGoBack;
  }
  return consumeInAppNavigation();
};

/**
 * Detay sayfasının "Geri"si. Uygulamanın bir sayfasından gelindiyse tarayıcı geçmişinde geri
 * gider: o sayfaya döner (akış istemci önbelleğinden, kaydırma konumu korunur). Doğrudan açılan
 * linkte geri gidilecek uygulama sayfası yoktur (başka siteye ya da boş sekmeye dönmesin) → sabit
 * hedef. Her durumda gerçek bir link: yeni sekmede açma ve JS'siz kullanım çalışır.
 */
export const BackButton = ({ fallbackHref }: { fallbackHref: string }): ReactElement => {
  const t = useTranslations('postDetail');
  const router = useRouter();
  return (
    <Link
      href={fallbackHref}
      aria-label={t('back')}
      data-testid='post-detail-back'
      className='inline-flex size-hit shrink-0 items-center justify-center rounded-md text-fg hover:bg-bg-muted'
      onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
        if (!canGoBackInApp()) return;
        event.preventDefault();
        router.back();
      }}
    >
      <ArrowLeft aria-hidden='true' className='size-5' />
    </Link>
  );
};
