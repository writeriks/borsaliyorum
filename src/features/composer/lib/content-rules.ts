import { countChars, firstPreviewableUrl, parseEntities, type ParsedEntity } from '@/lib/entities';

import type { ComposerMode } from '../types';

import { CHAR_LIMITS, CODE_UNIT_LIMITS } from './limits';

export type ContentAnalysis = {
  /** Grafem sayısı (sunucuyla aynı `countChars`). */
  count: number;
  limit: number;
  /** Ham code unit sınırı aşıldı (grafem sayısı sınır içinde olsa da; sunucuyla aynı sabit). */
  overCodeUnitLimit: boolean;
  isBlank: boolean;
  entities: ParsedEntity[];
  /** Metindeki tüm cashtag kodları (tekil, ilk görülme sırası). */
  cashtags: string[];
  /** Hisse indeksinde bulunanlar. İndeks yüklenmemişse boş. */
  knownCashtags: string[];
  /** Hisse indeksinde olmayanlar (K5: gönderi reddedilir, editör önceden işaretler). */
  unknownCashtags: string[];
  firstUrl: string | null;
};

const unique = (values: string[]): string[] => [...new Set(values)];

/**
 * Editör metninin composer kurallarına göre çözümlenmesi. Parser sunucuyla aynıdır
 * (ADR-0002 "tek parser"); `tickers` istemcideki hisse indeksidir, `null` = henüz yok.
 */
export const analyzeContent = (
  text: string,
  mode: ComposerMode,
  tickers: ReadonlySet<string> | null,
  /** Autocomplete'i açık (henüz yazılan) cashtag'in başlangıcı: bilinmeyen sayılmaz. */
  pendingCashtagStart: number | null = null
): ContentAnalysis => {
  const entities = parseEntities(text);
  const cashtagEntities = entities.filter(entity => entity.type === 'cashtag');
  const cashtags = unique(cashtagEntities.map(entity => entity.ticker));
  const settled = unique(
    cashtagEntities.filter(entity => entity.start !== pendingCashtagStart).map(e => e.ticker)
  );
  return {
    count: countChars(text),
    limit: CHAR_LIMITS[mode],
    overCodeUnitLimit: text.length > CODE_UNIT_LIMITS[mode],
    isBlank: text.trim() === '',
    entities,
    cashtags,
    knownCashtags: tickers ? cashtags.filter(ticker => tickers.has(ticker)) : [],
    unknownCashtags: tickers ? settled.filter(ticker => !tickers.has(ticker)) : [],
    firstUrl: firstPreviewableUrl(entities),
  };
};

export type SubmitBlocker =
  'empty' | 'overLimit' | 'sponsoredCashtag' | 'unknownCashtag' | 'submitting' | 'restricted';

/**
 * Sponsorluk anahtarı açıkken tanınmış cashtag paylaşımı engeller (legal HD-2, [LEG-07]).
 * İndeks yüklenemediyse (çevrimdışı) her cashtag tanınmış sayılır: engel tarafında hata yapmak,
 * sunucunun `SPONSORED_CASHTAG_BLOCKED` reddini kullanıcıya göndermeden önce göstermekten iyidir.
 */
export const isSponsoredCashtagBlocked = (
  analysis: ContentAnalysis,
  isSponsored: boolean,
  indexReady: boolean
): boolean =>
  isSponsored && (indexReady ? analysis.knownCashtags.length > 0 : analysis.cashtags.length > 0);

/** Duyarlılık seçimi yalnızca gönderide ve en az bir tanınmış cashtag varken (tasarım §1.5). */
export const isSentimentAvailable = (mode: ComposerMode, analysis: ContentAnalysis): boolean =>
  mode === 'post' && analysis.knownCashtags.length > 0;

/**
 * Paylaş'ı pasif yapan ilk neden; `null` = gönderilebilir. Sıra, kullanıcıya gösterilecek
 * mesajın önceliğidir: gönderiliyor > kısıtlı hesap > boş > sınır > sponsorlu+cashtag > bilinmeyen.
 */
export const getSubmitBlocker = (input: {
  analysis: ContentAnalysis;
  mode: ComposerMode;
  isSponsored: boolean;
  indexReady: boolean;
  submitting: boolean;
  restricted: boolean;
}): SubmitBlocker | null => {
  const { analysis, mode, isSponsored, indexReady, submitting, restricted } = input;
  if (submitting) return 'submitting';
  if (restricted) return 'restricted';
  if (analysis.isBlank) return 'empty';
  if (analysis.count > analysis.limit || analysis.overCodeUnitLimit) return 'overLimit';
  if (mode === 'post' && isSponsoredCashtagBlocked(analysis, isSponsored, indexReady)) {
    return 'sponsoredCashtag';
  }
  if (analysis.unknownCashtags.length > 0) return 'unknownCashtag';
  return null;
};
