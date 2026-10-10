const foldOnce = (name: string): string =>
  name
    .normalize('NFC')
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFC');

/**
 * Hashtag slug'ı ve arama katlaması: `#BIST100`, `#bist100`, `#BİST100` → `bist100`.
 * `İ I ı` dönüşümü lowercase'ten **önce** yapılır; aksi halde `'İ'.toLowerCase()` → `i\u0307`
 * (nokta birleştiricili) olur ve slug'lar ayrışır. Katlama sonrası NFC yeni bir Türkçe harf
 * oluşturabildiği için (`ş` + U+0327 → `s` + U+0327 → `ş`) sabit noktaya kadar tekrarlanır;
 * her tur Türkçe harf sayısını azalttığından birkaç turda biter.
 */
export const foldTag = (name: string): string => {
  let current = name;
  for (;;) {
    const next = foldOnce(current);
    if (next === current) return next;
    current = next;
  }
};

/**
 * Hisse kodu kanonik biçimi: yalnızca ASCII `a-z` büyütülür. `toLocaleUpperCase('tr')`
 * kullanılmaz: `sise` → `SİSE` olur ve `SISE` bulunamaz.
 */
export const toTicker = (raw: string): string => raw.replace(/[a-z]+/g, s => s.toUpperCase());
