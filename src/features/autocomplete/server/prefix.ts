const MAX_CODE_POINT = 0x10ffff;

/**
 * Önek aramasını bayt sıralı bir aralığa çevirir: `s` `q` ile başlıyorsa `lo <= s < hi`
 * (text_pattern_ops `~>=~` / `~<~`). `LIKE 'q%'` yerine aralık kullanılır çünkü:
 * - parametreli (generic) planda da `*_pattern_idx` index'i kullanılabilir (LIKE'ta sabit
 *   desen gerekir),
 * - `_` ve `%` LIKE joker karakteridir; kullanıcı adındaki `_` için kaçış gerekmez.
 *
 * `hi`: son kod noktası bir artırılır. UTF-8 bayt sırası kod noktası sırasını korur, bu yüzden
 * Türkçe/Unicode slug'larda da doğrudur. Vekil (surrogate) aralığı atlanır.
 */
export const prefixRange = (prefix: string): { lo: string; hi: string } => {
  const chars = [...prefix];
  const last = chars.pop();
  if (last === undefined) throw new RangeError('prefixRange: boş önek');
  const rest = chars.join('');
  const code = last.codePointAt(0) ?? 0;
  // Son kod noktası artırılamıyorsa üst sınır, önekin geri kalanının üst sınırıdır
  if (code === MAX_CODE_POINT) return { lo: prefix, hi: prefixRange(rest).hi };
  const nextCode = code + 1 === 0xd800 ? 0xe000 : code + 1;
  return { lo: prefix, hi: rest + String.fromCodePoint(nextCode) };
};
