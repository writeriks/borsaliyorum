// C0 (\n ve \t hariç), DEL ve C1 kontrol karakterleri; bidi işaret/override/isolate (U+061C,
// U+200E–200F, U+202A–202E, U+2066–2069) — `$THYAO` görünüp başka metin okunmasın diye.
// Görünmez ayırıcılar (U+00AD, U+180E, U+200B–200C, U+2060–2064, U+FEFF) ve etiket karakterleri
// (U+E0000–E007F): `$TH\u200BYAO` gibi görünen ile ayrıştırılanın ayrışmasını önler.
// ZWJ (U+200D) emoji dizileri için korunur. Bilinen bedel: etiket karakterli bölge bayrakları
// (🏴 + U+E0067 …) düz siyah bayrağa iner.
const STRIP_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B\u200C\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u{E0000}-\u{E007F}]/gu;
// Yalnızca boşluk/tab içeren satırlar da boş sayılır; 3+ boş satır 2'ye iner.
const EXCESS_BLANK_LINES_RE = /\n(?:[ \t]*\n){3,}/g;

/**
 * Grafem başına en fazla birleştirici işaret (`\p{M}`). "Zalgo" metni (bir harfe yüzlerce işaret)
 * satır kutusundan taşıp komşu gönderilerin üstüne biner ve grafem sınırını (1 grafem = 1 karakter)
 * anlamsızlaştırır. Gerçek dillerde (Vietnamca, Devanagari, Arapça harekeler) 4 yeterli.
 */
export const MAX_MARKS_PER_GRAPHEME = 4;

const MARK_RE = /\p{M}/u;

let segmenter: Intl.Segmenter | undefined;
const graphemes = (text: string): Iterable<Intl.SegmentData> => {
  segmenter ??= new Intl.Segmenter('tr', { granularity: 'grapheme' });
  return segmenter.segment(text);
};

const capGrapheme = (grapheme: string): string => {
  let marks = 0;
  let result = '';
  for (const char of grapheme) {
    if (MARK_RE.test(char)) {
      marks += 1;
      if (marks > MAX_MARKS_PER_GRAPHEME) continue;
    }
    result += char;
  }
  return result;
};

/**
 * Fazla işaretleri grafem içinde kırpar (ilk 4 kalır). Ardışık işaret dizisine bakmak yetmez:
 * ZWJ işaretleri ayırsa da aynı grafemde kalırlar (`a` + (4 işaret + ZWJ) × n). Hızlı yol: hiç
 * işaret yoksa (NFC sonrası Türkçe metnin çoğu) grafemlere bölünmez.
 */
const capMarks = (text: string): string => {
  if (!MARK_RE.test(text)) return text;
  let result = '';
  for (const { segment } of graphemes(text)) result += capGrapheme(segment);
  // Kırpma kanonik sırayı bozmaz ama birleşmeyi engelleyen işaret kalkmış olabilir
  return result.normalize('NFC');
};

/**
 * Saklama öncesi metin normalizasyonu (ADR-0002 Karar 2). İdempotenttir.
 * Sıra önemli: karakter silme NFC'den önce yapılır; silinen bir karakter iki birleşebilir
 * parçayı ayırıyor olabilir.
 */
export const normalizeContent = (raw: string): string =>
  capMarks(raw.replace(/\r\n?/g, '\n').replace(STRIP_RE, '').normalize('NFC'))
    .replace(EXCESS_BLANK_LINES_RE, '\n\n\n')
    .trim();

/** Grafem sayısı (`👨\u200D👩\u200D👧` = 1, `ğüşıöç` = 6). Sunucu ve istemci aynı sınırı uygular. */
export const countChars = (text: string): number => {
  let count = 0;
  for (const _segment of graphemes(text)) count += 1;
  return count;
};
