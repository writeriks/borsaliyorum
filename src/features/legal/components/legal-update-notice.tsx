'use client';

import { FileText } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { useOptionalAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { LEGAL_ACCEPTANCE_HREF } from '@/lib/legal/versions';

/**
 * Yasal metin paketinin yeni sürümü kabul edilmemişse kabukta kalıcı bant (okuma serbest,
 * yazma kapalı). Durum sunucudan gelir (AuthProvider'ın ilk değeri): yükleme anında bant
 * "yanıp sönmez". Kabul ekranının kendisinde gösterilmez.
 */
const LegalUpdateBanner = (): ReactElement | null => {
  const t = useTranslations('legalUpdate.banner');
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // usePathname yerel önekli ham yoldur (/en/yasal/yeni-surum)
  if (pathname.endsWith(LEGAL_ACCEPTANCE_HREF)) return null;

  const here = search ? `${pathname}?${search}` : pathname;
  return (
    <section
      aria-labelledby='legal-update-title'
      data-testid='legal-update-notice'
      className='flex flex-col gap-3 border-b border-border bg-bg-subtle px-4 py-4'
    >
      <div className='flex items-start gap-3'>
        <FileText aria-hidden='true' className='mt-1 size-5 shrink-0 text-info' />
        <div className='flex flex-col gap-1'>
          <h2 id='legal-update-title' className='text-sm font-semibold text-fg'>
            {t('title')}
          </h2>
          <p className='text-sm text-fg-muted'>{t('body')}</p>
        </div>
      </div>
      <div className='pl-8'>
        <Button asChild size='md'>
          <Link
            href={{ pathname: LEGAL_ACCEPTANCE_HREF, query: { next: here } }}
            data-testid='legal-update-cta'
          >
            {t('cta')}
          </Link>
        </Button>
      </div>
    </section>
  );
};

export const LegalUpdateNotice = (): ReactElement | null => {
  const session = useOptionalAuth()?.session;
  if (session?.status !== 'authenticated' || !session.user.legalAcceptanceRequired) return null;
  return <LegalUpdateBanner />;
};
