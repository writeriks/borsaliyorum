import { describe, expect, it } from 'vitest';

import { routing } from '@/i18n/routing';
import {
  LEGAL_DOCUMENTS,
  LEGAL_HREF,
  MARKETING_CONSENT_TEXT_VERSION,
  PRIVACY_NOTICE_VERSION,
  TERMS_VERSION,
} from '@/lib/legal/versions';

import enMain from '../../../messages/en.json';
import en from '../../../messages/legal/en.json';
import tr from '../../../messages/legal/tr.json';
import trMain from '../../../messages/tr.json';

import { getLegalCatalog, type LegalCatalog, PLACEHOLDER_KEYS } from './content';
import { parseLegalInline } from './inline';

const catalogs = Object.fromEntries(
  routing.locales.map(locale => [locale, getLegalCatalog(locale)])
) as Record<(typeof routing.locales)[number], LegalCatalog>;

/** Belgedeki tüm metinler (başlık, açıklama, paragraflar, liste öğeleri, tablo hücreleri). */
const allStrings = (catalog: LegalCatalog): string[] =>
  Object.values(catalog.documents).flatMap(doc => [
    doc.title,
    doc.description,
    ...doc.sections.flatMap(section => [
      section.heading,
      ...section.blocks.flatMap(block => {
        switch (block.type) {
          case 'p':
            return [block.text];
          case 'ul':
            return block.items;
          case 'table':
            return [block.caption, ...block.head, ...block.rows.flat()];
          case 'disclaimerFull':
            return [];
        }
      }),
    ]),
  ]);

const shape = (catalog: LegalCatalog): unknown =>
  Object.entries(catalog.documents).map(([key, doc]) => [
    key,
    doc.sections.map(section => [
      section.id,
      section.blocks.map(block =>
        block.type === 'ul'
          ? `ul:${block.items.length}`
          : block.type === 'table'
            ? `table:${block.head.length}x${block.rows.length}`
            : block.type
      ),
    ]),
  ]);

const tokensOf = (catalog: LegalCatalog, kind: 'placeholder' | 'link' | 'mail'): Set<string> =>
  new Set(
    allStrings(catalog)
      .flatMap(parseLegalInline)
      .flatMap(token =>
        token.kind !== kind
          ? []
          : token.kind === 'placeholder'
            ? [token.key]
            : token.kind === 'link'
              ? [token.doc]
              : ['support']
      )
  );

describe('yasal metin katalogları', () => {
  it('iki dilde de şemaya uyar (her belge var, boş metin yok)', () => {
    for (const locale of routing.locales) {
      expect(Object.keys(catalogs[locale].documents).sort()).toEqual(
        LEGAL_DOCUMENTS.map(doc => doc.key).sort()
      );
    }
  });

  it('tr ve en aynı yapıda: bölüm çapaları, blok türleri, liste/tablo boyutları', () => {
    expect(shape(catalogs.en)).toEqual(shape(catalogs.tr));
    expect(Object.keys(en.chrome).sort()).toEqual(Object.keys(tr.chrome).sort());
  });

  it('her satır içi işaret geçerli; yer tutucular, linkler ve e-posta iki dilde aynı', () => {
    for (const locale of routing.locales) {
      expect(() => allStrings(catalogs[locale]).forEach(parseLegalInline)).not.toThrow();
    }
    for (const kind of ['placeholder', 'link', 'mail'] as const) {
      expect([...tokensOf(catalogs.en, kind)].sort(), kind).toEqual(
        [...tokensOf(catalogs.tr, kind)].sort()
      );
    }
    // Tanımlı her yer tutucu en az bir yerde kullanılıyor (README listesiyle aynı küme)
    expect([...tokensOf(catalogs.tr, 'placeholder')].sort()).toEqual([...PLACEHOLDER_KEYS].sort());
  });

  it('dahili "taslak / avukat onayı" notu sayfalarda yok (onay durumu docs/legal/README.md)', () => {
    for (const locale of routing.locales) {
      const text = allStrings(catalogs[locale]).join('\n').toLocaleLowerCase(locale);
      // "taslak" tek başına aranmaz: metinde gönderi taslakları (yerel depolama) geçiyor
      expect(text, locale).not.toMatch(
        /avukat|lawyer|onay bekl|awaiting approval|taslak\s*[—–-]|draft\s*[—–-]|\btodo\b/
      );
    }
  });

  it('KVKK aydınlatma: zorunlu bölümler ve yurt dışı alıcılar (Google Firebase, Vercel, Neon)', () => {
    for (const locale of routing.locales) {
      const privacy = catalogs[locale].documents.privacy;
      expect(privacy.sections.map(section => section.id)).toEqual(
        expect.arrayContaining([
          'veri-sorumlusu',
          'amaclar-ve-hukuki-sebepler',
          'aktarim',
          'yurt-disi-aktarim',
          'saklama-sureleri',
          'haklarin',
          'basvuru',
        ])
      );
      const abroad = JSON.stringify(privacy.sections.find(s => s.id === 'yurt-disi-aktarim'));
      for (const recipient of [
        'Google LLC (Firebase Authentication)',
        'Vercel Inc.',
        'Neon Inc.',
      ]) {
        expect(abroad, `${locale} ${recipient}`).toContain(recipient);
      }
      // md.11 hakları: dokuz bent
      const rights = privacy.sections
        .find(s => s.id === 'haklarin')
        ?.blocks.find(b => b.type === 'ul');
      expect(rights?.type === 'ul' ? rights.items : []).toHaveLength(9);
      // Başvuru yolu: destek adresi (src/lib/support.ts)
      expect(JSON.stringify(privacy.sections.find(s => s.id === 'basvuru'))).toContain(
        '[[mail:support]]'
      );
    }
  });

  it('çerez politikası tablosu: __session, __Host-csrf, tema (localStorage); analitik yok', () => {
    for (const locale of routing.locales) {
      const table = catalogs[locale].documents.cookies.sections
        .flatMap(section => section.blocks)
        .find(block => block.type === 'table');
      const names = table?.type === 'table' ? table.rows.map(row => row[0]) : [];
      expect(names).toEqual(
        expect.arrayContaining([
          expect.stringContaining('__session'),
          expect.stringContaining('__Host-csrf'),
          expect.stringContaining('theme'),
        ])
      );
      expect(names.join(' ').toLowerCase()).not.toMatch(/analytics|_ga|posthog/);
    }
  });

  it('kullanım koşulları: zorunlu başlıklar (yasaklı içerik, manipülasyon, sponsorlu, lisans, yaptırım, uyuşmazlık)', () => {
    const ids = catalogs.tr.documents.terms.sections.map(section => section.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'yasakli-icerik',
        'piyasa-butunlugu',
        'sponsorlu-icerik',
        'icerik-lisansi',
        'yaptirimlar',
        'uyusmazliklar',
      ])
    );
  });

  it('yatırım uyarısı sayfası tam SPK metnini ana katalogdaki tek kaynaktan alır', () => {
    for (const locale of routing.locales) {
      const blocks = catalogs[locale].documents.disclaimer.sections.flatMap(s => s.blocks);
      expect(blocks.some(block => block.type === 'disclaimerFull')).toBe(true);
    }
    expect(trMain.legal.disclaimer.full).toMatch(/^Burada yer alan yatırım bilgi, yorum ve/);
    expect(enMain.legal.disclaimer.full.length).toBeGreaterThan(200);
  });
});

describe('sürümler ve adresler (lib/legal/versions.ts tek kaynak)', () => {
  it('sürüm biçimi YYYY-MM-vN ve ≤ 20 karakter (VarChar(20))', () => {
    for (const version of [
      ...LEGAL_DOCUMENTS.map(doc => doc.version),
      MARKETING_CONSENT_TEXT_VERSION,
    ]) {
      expect(version).toMatch(/^\d{4}-\d{2}-v\d+$/);
      expect(version.length).toBeLessThanOrEqual(20);
    }
    expect(LEGAL_DOCUMENTS.find(doc => doc.key === 'privacy')?.version).toBe(
      PRIVACY_NOTICE_VERSION
    );
    expect(LEGAL_DOCUMENTS.find(doc => doc.key === 'terms')?.version).toBe(TERMS_VERSION);
  });

  it('her belgenin adresi /yasal/<slug>; slug benzersiz', () => {
    for (const doc of LEGAL_DOCUMENTS) expect(LEGAL_HREF[doc.key]).toBe(`/yasal/${doc.slug}`);
    expect(new Set(LEGAL_DOCUMENTS.map(doc => doc.slug)).size).toBe(LEGAL_DOCUMENTS.length);
  });
});
