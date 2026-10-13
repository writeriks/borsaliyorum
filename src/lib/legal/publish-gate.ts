/**
 * Yasal metin yayın kapısı: production build'inde (`VERCEL_ENV=production`) metinlerde
 * doldurulmamış `[[ph:<anahtar>]]` (şirket unvanı, adres, aktarım dayanağı …) kalmışsa build
 * durur. `SKIP_ENV_VALIDATION` bu kontrolü ATLATMAZ: eksik unvanlı bir aydınlatma metni
 * yayımlamak KVKK md.10 ihlalidir. Preview ve yerel build'ler yer tutucularla devam eder.
 *
 * Saf modül (`server-only` yok): `next.config.ts` build aşamasında çağırır; katalogları
 * çağıran okur.
 */
const MARKER = '[[ph:';

/**
 * Düz `[[ph:` araması (regex değil): bozuk/alışılmadık biçimler (`[[ph:sirket-adi]]`,
 * `[[ph: company]]`, kapanışı eksik `[[ph:company]`) de yakalanır. Sıkı bir desen bunları
 * kaçırıp yer tutuculu metni production'a sızdırabilirdi. Anahtar yalnızca hata mesajı içindir.
 */
const placeholderKeys = (text: string): string[] => {
  const keys: string[] = [];
  let from = text.indexOf(MARKER);
  while (from !== -1) {
    const start = from + MARKER.length;
    const close = text.indexOf(']]', start);
    const next = text.indexOf(MARKER, start);
    const end = close === -1 || (next !== -1 && next < close) ? -1 : close;
    const key = end === -1 ? '' : text.slice(start, end).trim();
    keys.push(key.length > 0 && key.length <= 64 ? key : '?');
    from = next;
  }
  return keys;
};

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
      for (const key of placeholderKeys(text)) found.add(`${locale}:${key}`);
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
