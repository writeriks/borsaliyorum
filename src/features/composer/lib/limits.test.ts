import { describe, expect, it } from 'vitest';

import { CHAR_LIMITS, getCounterAnnouncement, getCounterState } from './limits';

describe('getCounterState (tasarım §1.3)', () => {
  it('gönderi: < 800 gizli, 800 sakin ve kalan 200 [CNT-01]', () => {
    expect(getCounterState(799, CHAR_LIMITS.post).tone).toBe('hidden');
    expect(getCounterState(800, CHAR_LIMITS.post)).toMatchObject({
      tone: 'subtle',
      remaining: 200,
    });
  });

  it('gönderi: 980–1000 uyarı [CNT-02]', () => {
    expect(getCounterState(979, 1000).tone).toBe('subtle');
    expect(getCounterState(985, 1000).tone).toBe('warn');
    expect(getCounterState(1000, 1000)).toMatchObject({ tone: 'warn', remaining: 0 });
  });

  it('sınır aşılınca tehlike ve negatif kalan [CNT-03]', () => {
    expect(getCounterState(1012, 1000)).toMatchObject({ tone: 'danger', remaining: -12, ratio: 1 });
  });

  it('yorum sınırı 500: 400’de görünür [CNT-06]', () => {
    expect(CHAR_LIMITS.comment).toBe(500);
    expect(getCounterState(399, 500).tone).toBe('hidden');
    expect(getCounterState(400, 500)).toMatchObject({ tone: 'subtle', remaining: 100 });
  });
});

describe('getCounterAnnouncement [CNT-05]', () => {
  it('eşiklere inerken tek duyuru', () => {
    expect(getCounterAnnouncement(101, 100)).toEqual({ kind: 'remaining', n: 100 });
    expect(getCounterAnnouncement(21, 20)).toEqual({ kind: 'remaining', n: 20 });
    expect(getCounterAnnouncement(1, 0)).toEqual({ kind: 'remaining', n: 0 });
  });

  it('eşik altında yazmaya devam etmek duyuru üretmez', () => {
    expect(getCounterAnnouncement(20, 19)).toBeNull();
    expect(getCounterAnnouncement(150, 140)).toBeNull();
  });

  it('yapıştırmayla eşik atlanırsa en küçük geçilen eşik duyurulur', () => {
    expect(getCounterAnnouncement(500, 10)).toEqual({ kind: 'remaining', n: 20 });
  });

  it('sınır ilk aşıldığında bir kez "aşıldı"', () => {
    expect(getCounterAnnouncement(0, -1)).toEqual({ kind: 'over' });
    expect(getCounterAnnouncement(5, -12)).toEqual({ kind: 'over' });
    expect(getCounterAnnouncement(-1, -2)).toBeNull();
  });

  it('silerken (kalan artarken) duyuru yok', () => {
    expect(getCounterAnnouncement(19, 25)).toBeNull();
  });
});
