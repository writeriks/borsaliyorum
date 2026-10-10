// C0 (\n ve \t hariç), DEL ve C1 kontrol karakterleri; bidi override/isolate (U+202A–202E,
// U+2066–2069) — `$THYAO` görünüp başka metin okunmasın diye. ZWJ (U+200D) emoji için korunur.
const STRIP_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;
// Yalnızca boşluk/tab içeren satırlar da boş sayılır; 3+ boş satır 2'ye iner.
const EXCESS_BLANK_LINES_RE = /\n(?:[ \t]*\n){3,}/g;

/**
 * Saklama öncesi metin normalizasyonu (ADR-0002 Karar 2). İdempotenttir.
 * Sıra önemli: karakter silme NFC'den önce yapılır; silinen bir karakter iki birleşebilir
 * parçayı ayırıyor olabilir.
 */
export const normalizeContent = (raw: string): string =>
  raw
    .replace(/\r\n?/g, '\n')
    .replace(STRIP_RE, '')
    .normalize('NFC')
    .replace(EXCESS_BLANK_LINES_RE, '\n\n\n')
    .trim();

let segmenter: Intl.Segmenter | undefined;

/** Grafem sayısı (`👨\u200D👩\u200D👧` = 1, `ğüşıöç` = 6). Sunucu ve istemci aynı sınırı uygular. */
export const countChars = (text: string): number => {
  segmenter ??= new Intl.Segmenter('tr', { granularity: 'grapheme' });
  let count = 0;
  for (const _segment of segmenter.segment(text)) count += 1;
  return count;
};
