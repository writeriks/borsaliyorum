/**
 * Hashtag katlama/geçerlilik kurallarının SQL karşılığını üretir (ADR-0002 Karar 2; TS:
 * `src/lib/entities/fold.ts`, `hashtag.ts`, `parse.ts`). Tag.slug backfill migration'ı bu
 * çıktıyı `-- BEGIN GENERATED hashtag-sql` / `-- END GENERATED hashtag-sql` arasında taşır.
 *
 * Neden üretiliyor: PostgreSQL regex'inde `\p{L}`, `\p{M}`, `\p{Script=…}` gibi Unicode
 * özellikleri yok; POSIX sınıfları ise DB'nin locale/ICU sürümüne bağlı. Sınıflar Node'un
 * (V8) Unicode tablolarından kod noktası aralıkları olarak çıkarılır; böylece SQL, TS ile aynı
 * karakter kümelerini kullanır.
 *
 *   npx tsx scripts/hashtag-sql.ts          # bloğu stdout'a yazar
 *   npx tsx scripts/hashtag-sql.ts --write  # migration'daki bloğu günceller (yalnızca uygulanmamış migration'da!)
 *
 * `tests/unit/hashtag-sql.test.ts` migration'daki bloğun bu çıktıyla aynı olduğunu doğrular.
 * Node'un Unicode sürümü değişip test kırılırsa: migration prod'a uygulanmışsa yeni bir
 * migration'da `CREATE OR REPLACE FUNCTION` ile güncellenir, uygulanmış migration düzenlenmez.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HASHTAG_SQL_MIGRATION = '20261010120500_m1_tag_slug_backfill';
export const BEGIN_MARKER = '-- BEGIN GENERATED hashtag-sql (scripts/hashtag-sql.ts)';
export const END_MARKER = '-- END GENERATED hashtag-sql';

const MAX_CODE_POINT = 0x10ffff;
const RANGES_PER_LINE = 8;

/** TS'teki düzenli ifadelerle birebir aynı sınıflar. */
const CLASSES = {
  // fold.ts DEFAULT_IGNORABLE_RE
  ignorable: /\p{Default_Ignorable_Code_Point}/u,
  // hashtag.ts LEADING_MARK_RE
  mark: /\p{M}/u,
  // hashtag.ts LETTER_RE
  letter: /\p{L}/u,
  // hashtag.ts INVALID_SLUG_CHAR_RE
  invalid: /[\s\p{C}]/u,
  // hashtag.ts LATIN_RE
  latin: /\p{Script=Latin}/u,
  // hashtag.ts LATIN_LOOKALIKE_SCRIPT_RE
  lookalike: /[\p{Script=Cyrillic}\p{Script=Greek}]/u,
  // parse.ts HASHTAG_BODY_RE
  body: /[\p{L}\p{N}\p{M}_]/u,
} as const;

type ClassName = keyof typeof CLASSES;

/**
 * Sınıfa giren kod noktası aralıkları. U+0000 ve vekil (surrogate) kod noktaları PostgreSQL
 * `text` içinde bulunamaz; dışarıda bırakılır.
 */
export const codePointRanges = (re: RegExp): Array<[number, number]> => {
  const ranges: Array<[number, number]> = [];
  let start = -1;
  for (let cp = 1; cp <= MAX_CODE_POINT + 1; cp += 1) {
    const inClass =
      cp <= MAX_CODE_POINT && !(cp >= 0xd800 && cp <= 0xdfff) && re.test(String.fromCodePoint(cp));
    if (inClass && start < 0) start = cp;
    if (!inClass && start >= 0) {
      ranges.push([start, cp - 1]);
      start = -1;
    }
  }
  return ranges;
};

const escape = (cp: number): string =>
  cp <= 0xffff
    ? `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`
    : `\\U${cp.toString(16).toUpperCase().padStart(8, '0')}`;

/**
 * Köşeli parantez ifadesi; SQL'de bitişik string literal'ları (satır sonuyla ayrılmış
 * `'…'` `'…'`) ayrıştırıcı birleştirir, böylece sabit tek bir desen olarak kalır.
 */
const bracket = (name: ClassName, prefix: string, suffix: string, indent: string): string => {
  const parts = codePointRanges(CLASSES[name]).map(([from, to]) =>
    from === to ? escape(from) : `${escape(from)}-${escape(to)}`
  );
  const lines: string[] = [];
  for (let i = 0; i < parts.length; i += RANGES_PER_LINE) {
    lines.push(parts.slice(i, i + RANGES_PER_LINE).join(''));
  }
  const first = `${prefix}[`;
  const last = `]${suffix}`;
  return [first, ...lines, last].map(line => `${indent}'${line}'`).join('\n');
};

/** Üretilen bloğun hangi Unicode tablosuyla üretildiği (`-- Unicode 16.0`). */
export const UNICODE_STAMP_PREFIX = '-- Unicode ';

/** Migration'daki Unicode damgası; yoksa null. */
export const readUnicodeStamp = (sql: string): string | null => {
  const block = extractGeneratedBlock(sql) ?? '';
  const line = block.split('\n').find(candidate => candidate.startsWith(UNICODE_STAMP_PREFIX));
  return line ? line.slice(UNICODE_STAMP_PREFIX.length).trim() : null;
};

export const generateHashtagSql = (
  unicodeVersion: string = process.versions.unicode ?? 'bilinmiyor'
): string => {
  const i = '      ';
  return `${BEGIN_MARKER}
-- Elle düzenlenmez. Karakter sınıfları Node'un Unicode tablolarından kod noktası aralıklarıdır.
${UNICODE_STAMP_PREFIX}${unicodeVersion}

-- TS foldTag (fold.ts) karşılığı: Default_Ignorable silme → NFKC → İ I ı → i → lowercase (ICU)
-- → ş ğ ü ö ç â î û katlama → NFKC; sonuç değişmeyene kadar tekrar.
CREATE FUNCTION fold_tag(name TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE AS $fold$
DECLARE
  cur TEXT := name;
  nxt TEXT;
BEGIN
  LOOP
    nxt := normalize(regexp_replace(cur,
${bracket('ignorable', '', '', i)},
      '', 'g'), NFKC);
    nxt := lower(translate(nxt, 'İIı', 'iii') COLLATE "und-x-icu");
    nxt := normalize(translate(nxt, 'şğüöçâîû', 'sguocaiu'), NFKC);
    IF nxt = cur THEN
      RETURN nxt;
    END IF;
    cur := nxt;
  END LOOP;
END;
$fold$;

-- TS toHashtagSlug (hashtag.ts) karşılığı: gövdenin slug'ı ya da NULL.
CREATE FUNCTION hashtag_slug(body TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE AS $slug$
DECLARE
  slug TEXT;
BEGIN
  -- Birleştirici işaretle başlayamaz
  IF body ~
${bracket('mark', '^', '', i)}
  THEN
    RETURN NULL;
  END IF;
  slug := fold_tag(body);
  -- En az bir harf; boşluk/kontrol/format/atanmamış karakter yok
  IF slug !~
${bracket('letter', '', '', i)}
  OR slug ~
${bracket('invalid', '', '', i)}
  THEN
    RETURN NULL;
  END IF;
  IF char_length(slug) > 50 THEN
    RETURN NULL;
  END IF;
  -- Latin harfi Kiril/Yunan harfiyle karışamaz (homograf taklidi)
  IF slug ~
${bracket('latin', '', '', i)}
  AND slug ~
${bracket('lookalike', '', '', i)}
  THEN
    RETURN NULL;
  END IF;
  RETURN slug;
END;
$slug$;

-- Eski uygulamanın Tag.tagName'i ('#BIST100'): '#' öneki atılır, gövde v2 hashtag gramerine
-- (parse.ts: [\\p{L}\\p{N}\\p{M}_]{1,50}) tamamen uymalı, sonra hashtag_slug.
CREATE FUNCTION legacy_tag_slug(tag_name TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE AS $legacy$
DECLARE
  body TEXT := regexp_replace(tag_name, '^#', '');
BEGIN
  IF char_length(body) > 50 OR body !~
${bracket('body', '^', '+$', i)}
  THEN
    RETURN NULL;
  END IF;
  RETURN hashtag_slug(body);
END;
$legacy$;
${END_MARKER}`;
};

const migrationPath = (): string =>
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'prisma/migrations',
    HASHTAG_SQL_MIGRATION,
    'migration.sql'
  );

/** Migration'daki üretilmiş blok (işaretler dahil); yoksa null. */
export const extractGeneratedBlock = (sql: string): string | null => {
  const start = sql.indexOf(BEGIN_MARKER);
  const end = sql.indexOf(END_MARKER);
  if (start < 0 || end < start) return null;
  return sql.slice(start, end + END_MARKER.length);
};

const main = async (): Promise<void> => {
  const generated = generateHashtagSql();
  if (!process.argv.includes('--write')) {
    console.log(generated);
    return;
  }
  const file = migrationPath();
  const sql = await readFile(file, 'utf8');
  const current = extractGeneratedBlock(sql);
  if (current === null) throw new Error(`${file}: üretilmiş blok işaretleri bulunamadı.`);
  // Fonksiyonla: üretilen SQL `$'` içerir, string replace onu özel desen sayardı
  await writeFile(
    file,
    sql.replace(current, () => generated)
  );
  console.log(`${file} güncellendi.`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
