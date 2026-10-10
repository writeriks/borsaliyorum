import { describe, expect, it } from 'vitest';

import {
  clearAllDrafts,
  clearDraft,
  type Draft,
  DRAFT_TTL_MS,
  draftKey,
  loadDraft,
  saveDraft,
} from './draft-storage';

/** Bellek içi `Storage` (unit projesi node ortamında koşar). */
class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

class ThrowingStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new DOMException('denied', 'SecurityError');
  }
  override setItem(): void {
    throw new DOMException('quota', 'QuotaExceededError');
  }
}

const draft: Draft = {
  text: 'Taslak',
  sentiment: 'bullish',
  isSponsored: false,
  previewDismissed: true,
};
const NOW = 1_800_000_000_000;

describe('draftKey (tasarım §1.8)', () => {
  it('gönderi ve gönderiye özel yorum anahtarları; sayısal DB kimliği', () => {
    expect(draftKey(42, { kind: 'post' })).toBe('bz:draft:42:post');
    expect(draftKey(42, { kind: 'comment', postId: 7 })).toBe('bz:draft:42:comment:7');
  });
});

describe('saveDraft / loadDraft', () => {
  it('kaydedilen taslak geri okunur [DRF-01, DRF-02]', () => {
    const storage = new MemoryStorage();
    saveDraft('k', draft, NOW, storage);
    expect(JSON.parse(storage.getItem('k') ?? '{}')).toMatchObject({
      v: 1,
      savedAt: NOW,
      text: 'Taslak',
    });
    expect(loadDraft('k', NOW + 1000, storage)).toEqual(draft);
  });

  it('taslakta yalnızca metin ve composer bayrakları var (token/e-posta yok)', () => {
    const storage = new MemoryStorage();
    saveDraft('k', draft, NOW, storage);
    expect(Object.keys(JSON.parse(storage.getItem('k') ?? '{}')).sort()).toEqual(
      ['isSponsored', 'previewDismissed', 'savedAt', 'sentiment', 'text', 'v'].sort()
    );
  });

  it('boş metin kaydedilmez, mevcut anahtar silinir', () => {
    const storage = new MemoryStorage();
    saveDraft('k', draft, NOW, storage);
    saveDraft('k', { ...draft, text: '  \n' }, NOW, storage);
    expect(storage.getItem('k')).toBeNull();
  });

  it('7 günden eski taslak düşer ve silinir', () => {
    const storage = new MemoryStorage();
    saveDraft('k', draft, NOW, storage);
    expect(loadDraft('k', NOW + DRAFT_TTL_MS + 1, storage)).toBeNull();
    expect(storage.getItem('k')).toBeNull();
  });

  it('bozuk ya da şemaya uymayan değer düşer', () => {
    const storage = new MemoryStorage();
    storage.setItem('a', '{bozuk');
    storage.setItem('b', JSON.stringify({ v: 1, savedAt: NOW, text: 'x', sentiment: 'moon' }));
    expect(loadDraft('a', NOW, storage)).toBeNull();
    expect(loadDraft('b', NOW, storage)).toBeNull();
    expect(storage.getItem('b')).toBeNull();
  });

  it('erişilemeyen depolama composer’ı bozmaz', () => {
    const storage = new ThrowingStorage();
    expect(() => saveDraft('k', draft, NOW, storage)).not.toThrow();
    expect(loadDraft('k', NOW, storage)).toBeNull();
    expect(loadDraft('k', NOW, null)).toBeNull();
  });

  it('clearDraft yalnızca o anahtarı siler [DRF-05]', () => {
    const storage = new MemoryStorage();
    saveDraft('a', draft, NOW, storage);
    saveDraft('b', draft, NOW, storage);
    clearDraft('a', storage);
    expect(storage.getItem('a')).toBeNull();
    expect(storage.getItem('b')).not.toBeNull();
  });
});

describe('clearAllDrafts (çıkış, [DRF-04])', () => {
  it('bz:draft: önekli tüm anahtarlar silinir, diğerleri kalır', () => {
    const storage = new MemoryStorage();
    saveDraft(draftKey(1, { kind: 'post' }), draft, NOW, storage);
    saveDraft(draftKey(1, { kind: 'comment', postId: 3 }), draft, NOW, storage);
    saveDraft(draftKey(2, { kind: 'post' }), draft, NOW, storage);
    storage.setItem('theme', 'dark');
    clearAllDrafts(storage);
    expect([...Array(storage.length).keys()].map(i => storage.key(i))).toEqual(['theme']);
  });
});
