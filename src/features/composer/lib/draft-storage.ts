import { z } from 'zod';

import { logger } from '@/lib/logger';

import { SENTIMENTS, type Sentiment } from '../types';

/**
 * Taslak koruma (tasarım §1.8, ADR-0002 Karar 3): yalnızca bu cihazın `localStorage`'ında,
 * sunucuya gitmez. Anahtarda DB'deki sayısal `userId` var (Firebase uid değil); değerde
 * yalnızca metin ve composer bayrakları — token/e-posta yok. Ömür 7 gün; çıkışta hepsi silinir.
 */
export const DRAFT_PREFIX = 'bz:draft:';
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type DraftTarget = { kind: 'post' } | { kind: 'comment'; postId: number };

export type Draft = {
  text: string;
  sentiment: Sentiment;
  isSponsored: boolean;
  previewDismissed: boolean;
};

const storedDraftSchema = z.object({
  v: z.literal(1),
  savedAt: z.number().int().nonnegative(),
  text: z.string().max(20_000),
  sentiment: z.enum(SENTIMENTS),
  isSponsored: z.boolean(),
  previewDismissed: z.boolean(),
});

/** `bz:draft:{userId}:post` ya da `bz:draft:{userId}:comment:{postId}` */
export const draftKey = (userId: number, target: DraftTarget): string =>
  target.kind === 'post'
    ? `${DRAFT_PREFIX}${userId}:post`
    : `${DRAFT_PREFIX}${userId}:comment:${target.postId}`;

/**
 * `localStorage` gizli pencerede, kapalı site verisinde ya da kota dolunca throw edebilir.
 * Taslak bir kolaylıktır: hata loglanır, composer çalışmaya devam eder.
 */
const getStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch (error) {
    logger.warn('draft storage unavailable', { err: error });
    return null;
  }
};

export const loadDraft = (
  key: string,
  now: number = Date.now(),
  storage: Storage | null = getStorage()
): Draft | null => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    const parsed = storedDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || now - parsed.data.savedAt > DRAFT_TTL_MS || !parsed.data.text.trim()) {
      storage.removeItem(key);
      return null;
    }
    const { text, sentiment, isSponsored, previewDismissed } = parsed.data;
    return { text, sentiment, isSponsored, previewDismissed };
  } catch (error) {
    logger.warn('draft load failed', { err: error });
    return null;
  }
};

/** Boş metin taslak değildir: anahtar silinir. */
export const saveDraft = (
  key: string,
  draft: Draft,
  now: number = Date.now(),
  storage: Storage | null = getStorage()
): void => {
  if (!storage) return;
  try {
    if (!draft.text.trim()) {
      storage.removeItem(key);
      return;
    }
    storage.setItem(key, JSON.stringify({ v: 1, savedAt: now, ...draft }));
  } catch (error) {
    logger.warn('draft save failed', { err: error });
  }
};

export const clearDraft = (key: string, storage: Storage | null = getStorage()): void => {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (error) {
    logger.warn('draft clear failed', { err: error });
  }
};

/**
 * Çıkışta çağrılır (S5 `signOut` akışı, [DRF-04]): paylaşılan cihazda başka bir kullanıcı
 * taslakları görmesin. Kullanıcıdan bağımsız olarak `bz:draft:` önekli her anahtar silinir.
 */
export const clearAllDrafts = (storage: Storage | null = getStorage()): void => {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch (error) {
    logger.warn('draft clear-all failed', { err: error });
  }
};
