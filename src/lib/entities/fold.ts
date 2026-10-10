// Görünmez/yok sayılabilir karakterler (U+034F, U+FE00–FE0F, U+3164, U+115F, U+1160,
// U+180B–180F, ZWJ/ZWNJ …): `#bist\u034F100` ile `#bist100` aynı etikete gitsin, `#\u3164\u3164` boş kalsın.
const DEFAULT_IGNORABLE_RE = /\p{Default_Ignorable_Code_Point}/gu;

const foldOnce = (name: string): string =>
  name
    .replace(DEFAULT_IGNORABLE_RE, '')
    // NFKC: tam genişlik (`ＢＩＳＴ`), matematiksel (`𝐁`) ve bağ (`ﬁ`) biçimleri sade harfe iner.
    .normalize('NFKC')
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    // Şapkalı harfler (ADR-0002 notu): `#kâr` ile `#kar` aynı etiket.
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .normalize('NFKC');

/**
 * Hashtag slug'ı ve arama katlaması: `#BIST100`, `#bist100`, `#BİST100` → `bist100`.
 * `İ I ı` dönüşümü lowercase'ten **önce** yapılır; aksi halde `'İ'.toLowerCase()` → `i̇`
 * (nokta birleştiricili) olur ve slug'lar ayrışır. Katlama sonrası NFKC yeni bir Türkçe harf
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
