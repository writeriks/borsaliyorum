/**
 * Yasal metin yayın kapısı: production build'inde (`VERCEL_ENV=production`) metinlerde
 * doldurulmamış `[[ph:<anahtar>]]` (şirket unvanı, adres, aktarım dayanağı …) kalmışsa build
 * durur. `SKIP_ENV_VALIDATION` bu kontrolü ATLATMAZ: eksik unvanlı bir aydınlatma metni
 * yayımlamak KVKK md.10 ihlalidir. Preview ve yerel build'ler yer tutucularla devam eder.
 *
 * Saf modül (`server-only` yok): `next.config.ts` build aşamasında çağırır; katalogları
 * çağıran okur.
 */
const PLACEHOLDER = /\[\[ph:([A-Za-z0-9]+)\]\]/g;

export class LegalPlaceholderError extends Error {
  constructor(readonly keys: readonly string[]) {
    super(
      `Yasal metinlerde doldurulmamış yer tutucu var (${keys.join(', ')}). Production'a ` +
        'yayımlanamaz; değerleri messages/legal/*.json içinde doldurun (docs/legal/README.md).'
    );
    this.name = 'LegalPlaceholderError';
  }
}

const collectStrings = (value: unknown, out: string[]): void => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, out);
  else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
};

/** `<dil>:<anahtar>` listesi (tekil, sıralı). */
export const findUnfilledPlaceholders = (catalogs: Readonly<Record<string, unknown>>): string[] => {
  const found = new Set<string>();
  for (const [locale, catalog] of Object.entries(catalogs)) {
    const strings: string[] = [];
    collectStrings(catalog, strings);
    for (const text of strings) {
      for (const match of text.matchAll(PLACEHOLDER)) found.add(`${locale}:${match[1] ?? ''}`);
    }
  }
  return [...found].sort();
};

export const assertLegalTextsPublishable = (
  env: Readonly<Record<string, string | undefined>>,
  catalogs: Readonly<Record<string, unknown>>
): void => {
  if (env.VERCEL_ENV !== 'production') return;
  const keys = findUnfilledPlaceholders(catalogs);
  if (keys.length > 0) throw new LegalPlaceholderError(keys);
};
