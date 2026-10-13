/** Akışta gövdenin satır sınırı (tasarım §3.2, §7.4); `line-clamp-6` ile aynı. */
export const CLAMP_LINES = 6;

/**
 * Satır başına tahmini karakter. Bilerek düşük (temkinli) tutulur: tahmin taşmayı kaçırırsa buton
 * sonradan eklenir ve kayma olur; fazla tahmin yalnızca görünmez, boş bir buton satırı bırakır.
 * - `narrow`: 360px telefon; metin alanı ≈ 288px, 15px gövdede ≈ 40 karakter sığar → 34.
 * - `wide`: `sm` (≥ 640px) ve üstü; metin alanı ≥ ≈ 480px, ≈ 64 karakter sığar → 56.
 */
export const CHARS_PER_LINE = { narrow: 34, wide: 56 } as const;

/** Satır sonları ve sarma ile kabaca satır sayısı (kod noktası; emoji tek karakter sayılır). */
export const estimateLines = (text: string, charsPerLine: number): number =>
  text
    .split('\n')
    .reduce(
      (lines, line) => lines + Math.max(1, Math.ceil(Array.from(line).length / charsPerLine)),
      0
    );

/**
 * "Devamını gör" satırının sunucuda ayrılıp ayrılmayacağı. `always`: her genişlikte; `narrow`:
 * yalnızca `sm` altında (genişte sığması beklenir); `none`: ayrılmaz.
 */
export type ReadMoreReserve = 'always' | 'narrow' | 'none';

export const readMoreReserveFor = (text: string): ReadMoreReserve => {
  if (estimateLines(text, CHARS_PER_LINE.wide) > CLAMP_LINES) return 'always';
  if (estimateLines(text, CHARS_PER_LINE.narrow) > CLAMP_LINES) return 'narrow';
  return 'none';
};
