import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { ComposeSheet } from '@/features/feed/components/compose-sheet';
import { resolveLocale } from '@/i18n/page-params';
import { requireUser } from '@/lib/auth/session';

type ComposePageProps = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: ComposePageProps): Promise<Metadata> => {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale });
  return { title: `${t('compose.title')} · ${t('metadata.title')}`, robots: { index: false } };
};

/**
 * `/paylas` (CMP-03): mobil alt tab bar'daki "Gönderi" sekmesi. Tam ekran composer sheet'i;
 * md+ genişlikte de aynı rota çalışır (sol menüdeki "Gönderi paylaş" dialog'u ayrı iş).
 */
const ComposePage = async ({ params }: ComposePageProps): Promise<ReactElement> => {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const viewer = await requireUser();
  const t = await getTranslations({ locale, namespace: 'compose' });
  return (
    <>
      <h1 className='sr-only'>{t('title')}</h1>
      <ComposeSheet viewerId={viewer.userId} />
    </>
  );
};

export default ComposePage;
