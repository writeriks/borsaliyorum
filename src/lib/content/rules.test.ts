import { describe, expect, it } from 'vitest';

import { CONTENT_MAX_CHARS } from '@/lib/content-limits';

import {
  acceptedPreviewUrl,
  analyzeContentForWrite,
  effectiveSentiment,
  MAX_ENTITIES_PER_TYPE,
} from './rules';

describe('analyzeContentForWrite', () => {
  it('metni normalize eder ve entity listelerini tekil, ilk görülme sırasıyla çıkarır', () => {
    const result = analyzeContentForWrite(
      ' $thyao #BIST100 @Ali_1 $THYAO #bist100 https://kap.org.tr/x\r\n',
      'post'
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.text).toBe('$thyao #BIST100 @Ali_1 $THYAO #bist100 https://kap.org.tr/x');
    expect(result.data.tickers).toEqual(['THYAO']);
    expect(result.data.hashtags).toEqual([{ slug: 'bist100', name: 'BIST100' }]);
    expect(result.data.mentions).toEqual(['ali_1']);
    expect(result.data.urls).toEqual(['https://kap.org.tr/x']);
  });

  it('boş ya da yalnızca görünmez karakter → CONTENT_EMPTY', () => {
    expect(analyzeContentForWrite('', 'post')).toEqual({ ok: false, error: 'CONTENT_EMPTY' });
    expect(analyzeContentForWrite(' ​\n‮ ', 'comment')).toEqual({
      ok: false,
      error: 'CONTENT_EMPTY',
    });
  });

  it('sınır CONTENT_MAX_CHARS ve grafem bazlı (gönderi 1000, yorum 500)', () => {
    const flag = '🇹🇷';
    expect(analyzeContentForWrite(flag.repeat(CONTENT_MAX_CHARS.post), 'post').ok).toBe(true);
    expect(analyzeContentForWrite(flag.repeat(CONTENT_MAX_CHARS.post + 1), 'post')).toEqual({
      ok: false,
      error: 'CONTENT_TOO_LONG',
      meta: { max: CONTENT_MAX_CHARS.post },
    });
    expect(analyzeContentForWrite('a'.repeat(CONTENT_MAX_CHARS.comment), 'comment').ok).toBe(true);
    expect(analyzeContentForWrite('a'.repeat(CONTENT_MAX_CHARS.comment + 1), 'comment')).toEqual({
      ok: false,
      error: 'CONTENT_TOO_LONG',
      meta: { max: CONTENT_MAX_CHARS.comment },
    });
  });

  it('sınır normalize edilmiş metne uygulanır (silinen görünmez karakterler sayılmaz)', () => {
    const text = `${'a'.repeat(CONTENT_MAX_CHARS.post)}${'​'.repeat(50)}`;
    expect(analyzeContentForWrite(text, 'post').ok).toBe(true);
  });

  it.each([
    ['cashtag', (i: number) => `$AB${String.fromCharCode(65 + i)}`],
    ['hashtag', (i: number) => `#etiket${i}x`],
    ['mention', (i: number) => `@kisi_${i}`],
  ])('tür başına 10 tekil %s kabul, 11 → TOO_MANY_ENTITIES', (_kind, make) => {
    const ten = Array.from({ length: MAX_ENTITIES_PER_TYPE }, (_, i) => make(i)).join(' ');
    expect(analyzeContentForWrite(ten, 'post').ok).toBe(true);
    expect(analyzeContentForWrite(`${ten} ${make(MAX_ENTITIES_PER_TYPE)}`, 'post')).toEqual({
      ok: false,
      error: 'TOO_MANY_ENTITIES',
      meta: { max: MAX_ENTITIES_PER_TYPE },
    });
  });

  it('URL içindeki $ # @ entity sayılmaz (tek parser)', () => {
    const result = analyzeContentForWrite('https://x.com/a#b?c=$d @ali', 'post');
    expect(result.ok && result.data.tickers).toEqual([]);
    expect(result.ok && result.data.mentions).toEqual(['ali']);
  });
});

describe('effectiveSentiment', () => {
  it("cashtag yoksa neutral'a zorlanır (K4)", () => {
    expect(effectiveSentiment({ tickers: [] }, 'bullish')).toBe('neutral');
    expect(effectiveSentiment({ tickers: ['THYAO'] }, 'bearish')).toBe('bearish');
  });
});

describe('acceptedPreviewUrl', () => {
  it("yalnızca metnin kendi URL'lerinden biri kabul edilir", () => {
    const content = { urls: ['https://kap.org.tr/x'] };
    expect(acceptedPreviewUrl(content, 'https://kap.org.tr/x')).toBe('https://kap.org.tr/x');
    expect(acceptedPreviewUrl(content, 'http://169.254.169.254/')).toBeNull();
    expect(acceptedPreviewUrl(content, null)).toBeNull();
    expect(acceptedPreviewUrl(content, undefined)).toBeNull();
  });
});
