/**
 * WCAG 2.x kontrast hesabı. Token'lar "H S% L%" biçiminde tutulduğu için girdi o biçimdir.
 * https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */

export type Rgb = readonly [r: number, g: number, b: number];

const HSL_RE = /^\s*(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*$/;

/** "220 20% 98%" → [0..255] RGB. Geçersiz biçimde hata fırlatır (sessizce 0 dönmesin). */
export const parseHslTriplet = (value: string): Rgb => {
  const match = HSL_RE.exec(value);
  if (!match) throw new Error(`Geçersiz HSL token değeri: "${value}"`);
  const [, hRaw = '0', sRaw = '0', lRaw = '0'] = match;
  return hslToRgb(Number(hRaw), Number(sRaw) / 100, Number(lRaw) / 100);
};

export const hslToRgb = (h: number, s: number, l: number): Rgb => {
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
};

const channel = (value: number): number => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = ([r, g, b]: Rgb): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
};
