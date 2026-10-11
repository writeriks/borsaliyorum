import { screen, within } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { LEGAL_DOCUMENTS } from '@/lib/legal/versions';
import { SUPPORT_EMAIL } from '@/lib/support';

import en from '../../../../../../messages/legal/en.json';
import tr from '../../../../../../messages/legal/tr.json';
import { MESSAGES, renderWithIntl, type TestLocale } from '../../../../../../tests/utils/render';

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async ({ locale, namespace }: { locale: TestLocale; namespace: string }) =>
    createTranslator({ locale, messages: MESSAGES[locale], namespace: namespace as 'metadata' }),
}));

const {
  default: LegalPage,
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} = await import('./page');

const LEGAL = { tr, en } as const;
const params = (locale: TestLocale, belge: string) => ({
  params: Promise.resolve({ locale, belge }),
});

const cases = (['tr', 'en'] as const).flatMap(locale =>
  LEGAL_DOCUMENTS.map(doc => [locale, doc] as const)
);

describe('/yasal/[belge]', () => {
  it('yalnızca tanımlı beş belge; bilinmeyen slug 404', async () => {
    expect(dynamicParams).toBe(false);
    expect(generateStaticParams().map(p => p.belge)).toEqual([
      'yatirim-uyarisi',
      'kvkk',
      'cerez-politikasi',
      'kullanim-kosullari',
      'topluluk-kurallari',
    ]);
    await expect(LegalPage(params('tr', 'gizli'))).rejects.toThrow();
    expect(await generateMetadata(params('tr', 'gizli'))).toEqual({});
  });

  it.each(cases)('%s %s: başlık, sürüm, yürürlük, içindekiler ve bölümler', async (locale, doc) => {
    const content = LEGAL[locale].documents[doc.key];
    renderWithIntl(await LegalPage(params(locale, doc.slug)), locale);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent(content.title);
    // Sürüm tek kaynaktan (lib/legal/versions.ts)
    expect(within(main).getByTestId('legal-version')).toHaveTextContent(doc.version);
    // Yürürlük tarihi belge başına (sürümle birlikte değişir)
    const day = Number(doc.effectiveDate.slice(8));
    expect(main).toHaveTextContent(locale === 'tr' ? `${day} Ekim 2026` : `${day} October 2026`);

    const toc = within(main).getByRole('navigation', { name: LEGAL[locale].chrome.toc });
    const tocLinks = within(toc).getAllByRole('link');
    expect(tocLinks.map(link => link.getAttribute('href'))).toEqual(
      content.sections.map(section => `#${section.id}`)
    );
    for (const section of content.sections) {
      expect(document.getElementById(section.id)).toHaveAccessibleName(section.heading);
    }

    // Diğer yasal metinler: kendisi hariç dördü
    const other = within(main).getByRole('navigation', {
      name: LEGAL[locale].chrome.otherDocuments,
    });
    expect(within(other).getAllByRole('link')).toHaveLength(LEGAL_DOCUMENTS.length - 1);

    // Dahili onay notu sayfada yok
    expect(main.textContent).not.toMatch(/avukat onayı|lawyer approval|Taslak —/i);
  });

  it('KVKK: yer tutucular işaretli, başvuru adresi src/lib/support.ts, yurt dışı tablosu', async () => {
    renderWithIntl(await LegalPage(params('tr', 'kvkk')), 'tr');
    const main = screen.getByRole('main');
    const company = main.querySelectorAll('[data-legal-placeholder="company"]');
    expect(company.length).toBeGreaterThan(0);
    expect(company[0]).toHaveTextContent(`[${tr.placeholders.company}]`);
    for (const link of within(main).getAllByRole('link', { name: SUPPORT_EMAIL })) {
      expect(link).toHaveAttribute('href', `mailto:${SUPPORT_EMAIL}`);
    }
    const abroad = within(main).getByRole('region', { name: 'Yurt dışındaki alıcılar' });
    for (const name of [
      'Google LLC (Firebase Authentication)',
      'Vercel Inc.',
      /Neon Inc\./,
      'GitHub Inc. (GitHub Actions)',
    ]) {
      expect(within(abroad).getByRole('rowheader', { name })).toBeInTheDocument();
    }
    // Mobilde yapışkan üst bar (56px) bölüm başlığını örtmesin: kaydırma payı üst bar + 16px
    expect(document.getElementById('veri-sorumlusu')?.className).toMatch(
      /(^| )scroll-mt-\[calc\(var\(--spacing-topbar\)\+1rem\)\]( |$)/
    );
    for (const link of within(main).getAllByRole('link', { name: /Çerez Politikası/ })) {
      expect(link).toHaveAttribute('href', '/yasal/cerez-politikasi');
    }
  });

  it('yatırım uyarısı: tam SPK metni (footer ile aynı kaynak) ana içerikte', async () => {
    renderWithIntl(await LegalPage(params('en', 'yatirim-uyarisi')), 'en');
    expect(
      within(screen.getByRole('main')).getByText(MESSAGES.en.legal.disclaimer.full)
    ).toBeInTheDocument();
  });

  it('metadata: belge başlığı + site adı ve açıklama; noindex yok', async () => {
    const meta = await generateMetadata(params('en', 'kullanim-kosullari'));
    expect(meta).toEqual({
      title: `${en.documents.terms.title} · ${MESSAGES.en.metadata.title}`,
      description: en.documents.terms.description,
    });
    expect(meta).not.toHaveProperty('robots');
  });
});
