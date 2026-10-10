import { describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db';
import { foldTag, parseEntities } from '@/lib/entities';

/**
 * TS ↔ SQL eşdeğerliği (ADR-0002 hashtag grameri): Tag.slug backfill'inin SQL fonksiyonları
 * (`fold_tag`, `legacy_tag_slug`) uygulamanın TS kurallarıyla aynı sonucu vermeli; aksi halde
 * backfill'de slug alan etiket ile v2'nin aynı metinden ürettiği slug ayrışır.
 */

/** TS referansı: eski `#Ad` biçimindeki etiket v2 parser'ında tam bir hashtag mi, slug'ı ne? */
const tsLegacySlug = (tagName: string): string | null => {
  const text = tagName.startsWith('#') ? tagName : `#${tagName}`;
  const [entity, ...rest] = parseEntities(text);
  if (rest.length > 0 || entity?.type !== 'hashtag') return null;
  return entity.start === 0 && entity.end === text.length ? entity.slug : null;
};

const SAMPLES: readonly string[] = [
  // ADR-0002 örnekleri ve Türkçe katlama
  '#BIST100',
  '#bist100',
  '#BİST100',
  '#bıst100',
  '#IĞDIR',
  '#ÇÖĞÜŞ',
  '#şeker',
  '#Şeker',
  '#İSTANBUL',
  '#ŞİŞE',
  '#I',
  '#ı',
  // Şapkalı harfler
  '#kâr',
  '#KÂR',
  '#îmân',
  '#Ûmit',
  // NFKC: tam genişlik, matematiksel, bağ, uyumluluk harfleri
  '#ＢＩＳＴ１００',
  '#𝐁𝐈𝐒𝐓',
  '#ﬁnans',
  '#x²',
  '#Ⅻ',
  '#①',
  '#Kelvin',
  '#ǅemal',
  // NFD birleştirici işaretler → NFKC ile Türkçe harf, sonra katlama
  '#temettü',
  '#şeker',
  '#é',
  '#́abc',
  // Default_Ignorable / görünmez dolgu
  '#bist͏100',
  '#ㅤㅤ',
  '#bist‍100',
  '#a­',
  // Homograf karışımı ve diğer yazı sistemleri
  '#ВIST100',
  '#βeta',
  '#αβγ',
  '#ΟΔΟΣ',
  '#привет',
  '#日本株',
  '#٣٤٥',
  '#abc٣',
  '#Straße',
  // Gramer dışı / sınırlar
  '#',
  '#123',
  '#_',
  '#a_b',
  `#${'a'.repeat(50)}`,
  `#${'a'.repeat(51)}`,
  `#${'ı'.repeat(50)}`,
  '#bist 100',
  '#bist#100',
  '#bist🚀',
  '#🚀',
  '#ﷺ',
  '#ͺ',
  '#bist.100',
  'bist100',
];

type Row = { input: string; fold: string; slug: string | null };

const runSql = async (inputs: readonly string[]): Promise<Row[]> =>
  getDb().$queryRaw<Row[]>`
    SELECT t.input, fold_tag(regexp_replace(t.input, '^#', '')) AS fold,
           legacy_tag_slug(t.input) AS slug
    FROM unnest(${inputs}::text[]) WITH ORDINALITY AS t(input, ord)
    ORDER BY t.ord`;

describe('hashtag SQL ↔ TS equivalence', () => {
  it('fold_tag(x) = foldTag(x) and legacy_tag_slug(x) = v2 parser slug for every sample', async () => {
    const rows = await runSql(SAMPLES);

    const expected = SAMPLES.map(input => ({
      input,
      fold: foldTag(input.replace(/^#/, '')),
      slug: tsLegacySlug(input),
    }));
    expect(rows).toEqual(expected);
  });

  it('covers both accepted and rejected tags (sanity of the sample set)', () => {
    const slugs = SAMPLES.map(tsLegacySlug);
    expect(slugs.filter(s => s === null).length).toBeGreaterThan(10);
    expect(slugs).toContain('bist100');
    expect(slugs).toContain('kar');
    expect(tsLegacySlug('#ВIST100')).toBeNull();
  });
});
