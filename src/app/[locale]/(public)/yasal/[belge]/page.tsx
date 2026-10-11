import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { LegalDocumentView } from '@/features/legal/components/legal-document-view';
import { getLegalCatalog } from '@/features/legal/content';
import { resolveLocale } from '@/i18n/page-params';
import { findLegalDocument, LEGAL_DOCUMENTS, LEGAL_EFFECTIVE_DATE } from '@/lib/legal/versions';

type LegalPageProps = { params: Promise<{ locale: string; belge: string }> };

// Yalnızca tanımlı belgeler; başka slug → yerelleştirilmiş 404
export const dynamicParams = false;

export const generateStaticParams = (): { belge: string }[] =>
  LEGAL_DOCUMENTS.map(doc => ({ belge: doc.slug }));

/** Herkese açık ve indekslenebilir (noindex yok): aydınlatma/koşullar kalıcı, paylaşılabilir URL. */
export const generateMetadata = async ({ params }: LegalPageProps): Promise<Metadata> => {
  const { locale: raw, belge } = await params;
  const doc = findLegalDocument(belge);
  if (!doc) return {};
  const locale = resolveLocale(raw);
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const content = getLegalCatalog(locale).documents[doc.key];
  return { title: `${content.title} · ${t('title')}`, description: content.description };
};

const LegalPage = async ({ params }: LegalPageProps): Promise<ReactElement> => {
  const { locale: raw, belge } = await params;
  const doc = findLegalDocument(belge);
  if (!doc) notFound();
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const catalog = getLegalCatalog(locale);
  const tFooter = await getTranslations({ locale, namespace: 'shell.footer' });
  const tDisclaimer = await getTranslations({ locale, namespace: 'legal.disclaimer' });

  return (
    // Oturum durumu kabukta AuthProvider'dan okunur (kök layout sunucuda çözer; flash yok)
    <AppShell>
      <LegalDocumentView
        locale={locale}
        docKey={doc.key}
        content={catalog.documents[doc.key]}
        chrome={catalog.chrome}
        placeholders={catalog.placeholders}
        version={doc.version}
        effectiveDate={LEGAL_EFFECTIVE_DATE}
        disclaimerText={tDisclaimer('full')}
        documentLabels={{
          disclaimer: tFooter('disclaimerLink'),
          privacy: tFooter('privacy'),
          cookies: tFooter('cookies'),
          terms: tFooter('terms'),
          community: tFooter('community'),
        }}
      />
    </AppShell>
  );
};

export default LegalPage;
