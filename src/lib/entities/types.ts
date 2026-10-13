/**
 * Entity tipleri (ADR-0002 Karar 1). Offset'ler UTF-16 code unit, `[start, end)` —
 * `text.slice(start, end)` ile birebir.
 */
export const ENTITY_SCHEMA_VERSION = 1;

/** Sunucuda çözülmüş (id'li) ve `Post.entities` içinde saklanan entity. */
export type Entity =
  | { type: 'cashtag'; start: number; end: number; ticker: string; stockId: number }
  | { type: 'hashtag'; start: number; end: number; slug: string; tagId: number }
  | { type: 'mention'; start: number; end: number; username: string; userId: number }
  | { type: 'url'; start: number; end: number; href: string };

export type StoredEntities = { v: typeof ENTITY_SCHEMA_VERSION; items: Entity[] };

export type EntityType = Entity['type'];

/**
 * `parseEntities` çıktısı: yalnızca metinden çıkarılan, henüz DB'ye karşı çözülmemiş biçim.
 * `hashtag.name` yazıldığı hâliyle gövdedir (`Tag.tagName` ilk kullanılan biçim olur).
 */
export type ParsedEntity =
  | { type: 'cashtag'; start: number; end: number; ticker: string }
  | { type: 'hashtag'; start: number; end: number; slug: string; name: string }
  | { type: 'mention'; start: number; end: number; username: string }
  | { type: 'url'; start: number; end: number; href: string };

export type TriggerKind = 'cashtag' | 'hashtag' | 'mention';

/** Autocomplete için imleçten önceki etkin tetikleyici; `start` tetikleyici karakterin offset'i. */
export type ActiveTrigger = { kind: TriggerKind; query: string; start: number };
