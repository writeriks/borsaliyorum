import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../../../../tests/utils/render';
import type { LegalDocumentContent } from '../content';

import { LegalDocumentView } from './legal-document-view';

const placeholders = {
  company: 'Şirket',
  address: 'Adres',
  mersis: 'MERSİS',
  kep: 'KEP',
  dbRegion: 'Bölge',
  transferSafeguard: 'Dayanak',
  appRegion: 'Uygulama bölgesi',
  court: 'Mahkeme',
};

/** Aynı metnin bir listede / tabloda iki kez geçmesi (ör. "Zorunlu", "[[ph:transferSafeguard]]"). */
const content: LegalDocumentContent = {
  title: 'Belge',
  description: 'Açıklama',
  sections: [
    {
      id: 'bolum',
      heading: 'Bölüm',
      blocks: [
        { type: 'ul', items: ['Aynı madde', 'Aynı madde'] },
        {
          type: 'table',
          caption: 'Tablo',
          head: ['Tür', 'Tür'],
          rows: [
            ['Zorunlu', 'Zorunlu'],
            ['Zorunlu', 'Zorunlu'],
          ],
        },
      ],
    },
  ],
};

describe('LegalDocumentView', () => {
  it('yinelenen liste/tablo metinlerinde React anahtar uyarısı yok, hepsi render edilir', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderWithIntl(
      <LegalDocumentView
        locale='tr'
        docKey='cookies'
        content={content}
        chrome={{
          toc: 'İçindekiler',
          version: 'Sürüm {version}',
          effective: '{date}',
          otherDocuments: 'Diğer',
        }}
        placeholders={placeholders}
        version='2026-10-v2'
        effectiveDate='2026-10-11'
        disclaimerText='Uyarı'
        documentLabels={{
          disclaimer: 'Uyarı',
          privacy: 'KVKK',
          cookies: 'Çerez',
          terms: 'Koşullar',
          community: 'Kurallar',
        }}
      />
    );
    expect(screen.getAllByText('Aynı madde')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Tür' })).toHaveLength(2);
    expect(screen.getAllByRole('rowheader', { name: 'Zorunlu' })).toHaveLength(2);
    const keyWarnings = consoleError.mock.calls.filter(call =>
      String(call[0]).includes('same key')
    );
    expect(keyWarnings).toEqual([]);
  });
});
