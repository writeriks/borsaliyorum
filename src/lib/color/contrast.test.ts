import { describe, expect, it } from 'vitest';

import { contrastRatio, hslToRgb, parseHslTriplet } from './contrast';

describe('contrast', () => {
  it('siyah/beyaz 21:1, aynı renk 1:1', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([10, 20, 30], [10, 20, 30])).toBeCloseTo(1, 5);
  });

  it('sıra fark etmez', () => {
    const a = parseHslTriplet('228 74% 48%');
    const b = parseHslTriplet('220 20% 98%');
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it('HSL → RGB bilinen değerler', () => {
    expect(hslToRgb(0, 1, 0.5).map(Math.round)).toEqual([255, 0, 0]);
    expect(hslToRgb(120, 1, 0.25).map(Math.round)).toEqual([0, 128, 0]);
    expect(parseHslTriplet('0 0% 100%').map(Math.round)).toEqual([255, 255, 255]);
  });

  it('bilinen WCAG örneği: #777 beyaz üzerinde ~4.48', () => {
    expect(contrastRatio([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 2);
  });

  it('geçersiz biçimi reddeder', () => {
    expect(() => parseHslTriplet('#ffffff')).toThrow();
    expect(() => parseHslTriplet('220, 20%, 98%')).toThrow();
  });
});
