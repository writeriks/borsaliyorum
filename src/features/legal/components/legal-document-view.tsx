import type { ReactElement } from 'react';

import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { LEGAL_DOCUMENTS, LEGAL_HREF, type LegalDocumentKey } from '@/lib/legal/versions';

import type { LegalBlock, LegalCatalog, LegalDocumentContent, PlaceholderKey } from '../content';

import { LegalInline } from './legal-inline';

type LegalDocumentViewProps = {
  locale: Locale;
  docKey: LegalDocumentKey;
  content: LegalDocumentContent;
  chrome: LegalCatalog['chrome'];
  placeholders: Readonly<Record<PlaceholderKey, string>>;
  version: string;
  /** ISO tarih (YYYY-MM-DD) */
  effectiveDate: string;
  /** Tam SPK uyarı metni (`legal.disclaimer.full`): footer ile tek kaynak */
  disclaimerText: string;
  /** Diğer belgelerin footer etiketleri (`shell.footer.*`) */
  documentLabels: Readonly<Record<LegalDocumentKey, string>>;
};

const formatDate = (iso: string, locale: Locale): string =>
  new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(`${iso}T12:00:00Z`));

const fill = (template: string, key: string, value: string): string =>
  template.replace(`{${key}}`, value);

const Block = ({
  block,
  placeholders,
  disclaimerText,
  blockId,
}: {
  block: LegalBlock;
  placeholders: LegalDocumentViewProps['placeholders'];
  disclaimerText: string;
  blockId: string;
}): ReactElement => {
  switch (block.type) {
    case 'p':
      return (
        <p>
          <LegalInline text={block.text} placeholders={placeholders} />
        </p>
      );
    case 'ul':
      return (
        <ul className='flex list-disc flex-col gap-2 pl-6 marker:text-fg-subtle'>
          {block.items.map((item, index) => (
            // Aynı metin iki kez geçebilir: anahtar sıra + metin
            <li key={`${index}-${item}`}>
              <LegalInline text={item} placeholders={placeholders} />
            </li>
          ))}
        </ul>
      );
    case 'table': {
      const captionId = `${blockId}-caption`;
      return (
        // Dar ekranda tablo kendi içinde kayar; klavyeyle kaydırılabilsin diye odaklanabilir bölge
        <div
          role='region'
          aria-labelledby={captionId}
          tabIndex={0}
          className='overflow-x-auto rounded-md border border-border'
        >
          <table className='w-full min-w-120 border-collapse text-left text-sm'>
            <caption id={captionId} className='px-3 py-2 text-left text-xs text-fg-muted'>
              {block.caption}
            </caption>
            <thead className='bg-bg-subtle'>
              <tr>
                {block.head.map((cell, index) => (
                  <th
                    key={`${index}-${cell}`}
                    scope='col'
                    className='border-t border-border px-3 py-2 font-semibold text-fg'
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row.join('|')}`} className='align-top'>
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th
                        key={`${index}-${cell}`}
                        scope='row'
                        className='border-t border-border px-3 py-2 font-medium text-fg'
                      >
                        <LegalInline text={cell} placeholders={placeholders} />
                      </th>
                    ) : (
                      <td key={`${index}-${cell}`} className='border-t border-border px-3 py-2'>
                        <LegalInline text={cell} placeholders={placeholders} />
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'disclaimerFull':
      return (
        <p
          data-slot='investment-disclaimer-full'
          className='rounded-md border border-border-strong bg-bg-subtle p-4 text-fg'
        >
          {disclaimerText}
        </p>
      );
  }
};

/**
 * Yasal belge görünümü (server component; sayfa istek başına sunucuda render edilir): başlık, sürüm + yürürlük tarihi (tek kaynak
 * `lib/legal/versions.ts`), içindekiler, bölümler ve diğer yasal metinlere bağlantılar.
 */
export const LegalDocumentView = ({
  locale,
  docKey,
  content,
  chrome,
  placeholders,
  version,
  effectiveDate,
  disclaimerText,
  documentLabels,
}: LegalDocumentViewProps): ReactElement => (
  <article data-legal-document={docKey} className='flex flex-col gap-8 px-4 py-8 sm:py-12'>
    <header className='flex flex-col gap-3'>
      <h1 className='text-2xl font-bold tracking-tight text-fg'>{content.title}</h1>
      <p className='text-sm text-fg-muted'>{content.description}</p>
      <p className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle tabular-nums'>
        <span data-testid='legal-version'>{fill(chrome.version, 'version', version)}</span>
        <span>{fill(chrome.effective, 'date', formatDate(effectiveDate, locale))}</span>
      </p>
    </header>

    <nav aria-labelledby='legal-toc' className='rounded-lg border border-border bg-bg-subtle p-4'>
      <h2 id='legal-toc' className='text-sm font-semibold text-fg'>
        {chrome.toc}
      </h2>
      <ol className='mt-2 flex list-decimal flex-col pl-6 text-sm marker:text-fg-subtle'>
        {content.sections.map(section => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className='inline-flex min-h-hit items-center text-accent underline-offset-2 hover:underline'
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>

    {content.sections.map(section => (
      <section
        key={section.id}
        id={section.id}
        aria-labelledby={`${section.id}-baslik`}
        // Mobilde yapışkan üst bar (56px) başlığı örtmesin; md+ üst bar yok
        className='flex scroll-mt-[calc(var(--spacing-topbar)+1rem)] flex-col gap-3 text-sm leading-relaxed text-fg-muted md:scroll-mt-4'
      >
        <h2 id={`${section.id}-baslik`} className='text-lg font-semibold text-fg'>
          {section.heading}
        </h2>
        {section.blocks.map((block, index) => (
          <Block
            key={`${section.id}-${index}`}
            block={block}
            blockId={`${section.id}-${index}`}
            placeholders={placeholders}
            disclaimerText={disclaimerText}
          />
        ))}
      </section>
    ))}

    <nav aria-labelledby='legal-other' className='border-t border-border pt-6'>
      <h2 id='legal-other' className='text-sm font-semibold text-fg'>
        {chrome.otherDocuments}
      </h2>
      <ul className='mt-2 flex flex-col text-sm'>
        {LEGAL_DOCUMENTS.filter(doc => doc.key !== docKey).map(doc => (
          <li key={doc.key}>
            <Link
              href={LEGAL_HREF[doc.key]}
              className='inline-flex min-h-hit items-center text-accent underline-offset-2 hover:underline'
            >
              {documentLabels[doc.key]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  </article>
);
