import { describe, expect, it } from 'vitest';

import {
  analyzeContent,
  getSubmitBlocker,
  isSentimentAvailable,
  isSponsoredCashtagBlocked,
} from './content-rules';

const TICKERS: ReadonlySet<string> = new Set(['THYAO', 'ASELS']);

const blocker = (
  text: string,
  options: Partial<{
    mode: 'post' | 'comment';
    isSponsored: boolean;
    tickers: ReadonlySet<string> | null;
    submitting: boolean;
    restricted: boolean;
  }> = {}
): ReturnType<typeof getSubmitBlocker> => {
  const mode = options.mode ?? 'post';
  const tickers = options.tickers === undefined ? TICKERS : options.tickers;
  return getSubmitBlocker({
    analysis: analyzeContent(text, mode, tickers),
    mode,
    isSponsored: options.isSponsored ?? false,
    indexReady: tickers !== null,
    submitting: options.submitting ?? false,
    restricted: options.restricted ?? false,
  });
};

describe('analyzeContent', () => {
  it('grafem sayar: ZWJ emoji 1, Türkçe harfler tek tek [CNT-04]', () => {
    expect(analyzeContent('👨‍👩‍👧', 'post', TICKERS).count).toBe(1);
    expect(analyzeContent('ğüşıöç', 'post', TICKERS).count).toBe(6);
  });

  it('bilinen/bilinmeyen cashtag ayrımı (K5)', () => {
    const result = analyzeContent('$THYAO $zzzz $thyao', 'post', TICKERS);
    expect(result.cashtags).toEqual(['THYAO', 'ZZZZ']);
    expect(result.knownCashtags).toEqual(['THYAO']);
    expect(result.unknownCashtags).toEqual(['ZZZZ']);
  });

  it('indeks yoksa bilinmeyen işaretlenmez', () => {
    expect(analyzeContent('$ZZZZ', 'post', null).unknownCashtags).toEqual([]);
  });

  it('yazılmakta olan (autocomplete açık) cashtag bilinmeyen sayılmaz', () => {
    expect(analyzeContent('Bak $th', 'post', TICKERS, 4).unknownCashtags).toEqual([]);
    expect(analyzeContent('Bak $th', 'post', TICKERS, null).unknownCashtags).toEqual(['TH']);
  });

  it('ilk önizlenebilir URL', () => {
    expect(analyzeContent('bak https://ornek.com/a ve www.b.com', 'post', TICKERS).firstUrl).toBe(
      'https://ornek.com/a'
    );
  });
});

describe('getSubmitBlocker', () => {
  it('boş ve yalnızca boşluk/satır sonu → empty [SND-01]', () => {
    expect(blocker('')).toBe('empty');
    expect(blocker('  \n \n')).toBe('empty');
  });

  it('sınır aşılırsa overLimit; yorumda 500 [CNT-03, CNT-06]', () => {
    expect(blocker('a'.repeat(1000))).toBeNull();
    expect(blocker('a'.repeat(1001))).toBe('overLimit');
    expect(blocker('a'.repeat(501), { mode: 'comment' })).toBe('overLimit');
  });

  it('cashtag zorunlu değil (K4)', () => {
    expect(blocker('Piyasa sakin')).toBeNull();
  });

  it('sponsorlu + tanınmış cashtag → engel [LEG-07]', () => {
    expect(blocker('$THYAO hedef', { isSponsored: true })).toBe('sponsoredCashtag');
    expect(blocker('Marka işbirliği', { isSponsored: true })).toBeNull();
    expect(blocker('$THYAO hedef', { isSponsored: false })).toBeNull();
  });

  it('indeks yüklenemediyse sponsorlu gönderide her cashtag engeller', () => {
    expect(blocker('$ABCD', { isSponsored: true, tickers: null })).toBe('sponsoredCashtag');
  });

  it('yorumda sponsorluk kuralı uygulanmaz, cashtag serbest', () => {
    expect(blocker('$THYAO güzel', { mode: 'comment', isSponsored: true })).toBeNull();
  });

  it('bilinmeyen cashtag → unknownCashtag (K5)', () => {
    expect(blocker('$ZZZZ yükselir')).toBe('unknownCashtag');
  });

  it('öncelik: gönderiliyor > kısıtlı > boş', () => {
    expect(blocker('', { submitting: true })).toBe('submitting');
    expect(blocker('', { restricted: true })).toBe('restricted');
  });
});

describe('isSentimentAvailable / isSponsoredCashtagBlocked', () => {
  it('duyarlılık yalnızca gönderide ve tanınmış cashtag varken [SEN-01, SEN-02]', () => {
    expect(isSentimentAvailable('post', analyzeContent('metin', 'post', TICKERS))).toBe(false);
    expect(isSentimentAvailable('post', analyzeContent('$THYAO', 'post', TICKERS))).toBe(true);
    expect(isSentimentAvailable('post', analyzeContent('$ZZZZ', 'post', TICKERS))).toBe(false);
    expect(isSentimentAvailable('comment', analyzeContent('$THYAO', 'comment', TICKERS))).toBe(
      false
    );
  });

  it('anahtar kapalıyken engel yok', () => {
    expect(isSponsoredCashtagBlocked(analyzeContent('$THYAO', 'post', TICKERS), false, true)).toBe(
      false
    );
  });
});
