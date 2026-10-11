import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { LegalAcceptanceForm } from '@/features/legal/components/legal-acceptance-form';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/page-params';
import { redirectToNext } from '@/lib/auth/redirect-next';
import { safeNextPath } from '@/lib/auth/rules';
import { requireUser } from '@/lib/auth/session';
import { LEGAL_DOCUMENTS, LEGAL_HREF, type LegalDocumentKey } from '@/lib/legal/versions';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

/** Kabul paketindeki belgeler (Koşullar + Topluluk Kuralları + Yatırım Uyarısı). */
const BUNDLE_DOCUMENTS: readonly LegalDocumentKey[] = ['terms', 'community', 'disclaimer'];

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale });
  return {
    title: `${t('legalUpdate.metaTitle')} · ${t('metadata.title')}`,
    robots: { index: false },
  };
};

/**
 * Yasal metin paketinin yeni sürümünü kabul ekranı (girişli kullanıcı; `(app)` layout'u
 * korur). Paket zaten güncelse `next`'e (yoksa akışa) yönlendirir. Kabul edilene kadar
 * okuma serbest, yazma kapalı (`requireWriter` → `LEGAL_ACCEPTANCE_REQUIRED`).
 */
const LegalUpdatePage = async ({ params, searchParams }: Props): Promise<ReactElement> => {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const raw = (await searchParams).next;
  const next = safeNextPath(typeof raw === 'string' ? raw : null);
  const user = await requireUser();
  if (!user.legalAcceptanceRequired) return redirectToNext(next);

  const t = await getTranslations({ locale, namespace: 'legalUpdate' });
  const tFooter = await getTranslations({ locale, namespace: 'shell.footer' });
  const label: Record<LegalDocumentKey, string> = {
    disclaimer: tFooter('disclaimerLink'),
    privacy: tFooter('privacy'),
    cookies: tFooter('cookies'),
    terms: tFooter('terms'),
    community: tFooter('community'),
  };

  return (
    <article className='flex flex-col gap-6 px-4 py-8 sm:py-12'>
      <header className='flex flex-col gap-3'>
        <h1 className='text-2xl font-bold tracking-tight text-fg'>{t('title')}</h1>
        <p className='text-sm text-fg-muted'>{t('intro')}</p>
      </header>

      <section aria-labelledby='legal-update-documents' className='flex flex-col gap-2'>
        <h2 id='legal-update-documents' className='text-sm font-semibold text-fg'>
          {t('documents')}
        </h2>
        <ul className='flex flex-col rounded-lg border border-border bg-bg-subtle px-4 py-2'>
          {LEGAL_DOCUMENTS.filter(doc => BUNDLE_DOCUMENTS.includes(doc.key)).map(doc => (
            <li key={doc.key} className='flex flex-wrap items-center justify-between gap-x-4'>
              {/* Yeni sekme: kabul ekranı ve form kaybolmasın */}
              <Link
                href={LEGAL_HREF[doc.key]}
                target='_blank'
                className='inline-flex min-h-hit items-center text-sm font-medium text-accent underline-offset-2 hover:underline'
              >
                {label[doc.key]}
              </Link>
              <span className='text-xs text-fg-subtle tabular-nums'>
                {t('version', { version: doc.version })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <LegalAcceptanceForm next={next} />

      <p className='text-xs text-fg-muted'>
        {t('decline')}{' '}
        <a href={SUPPORT_MAILTO} className='font-medium text-accent underline underline-offset-2'>
          {SUPPORT_EMAIL}
        </a>
      </p>
    </article>
  );
};

export default LegalUpdatePage;
