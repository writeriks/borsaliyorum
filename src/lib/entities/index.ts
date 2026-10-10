// Tek entity parser (ADR-0002 Karar 2): saf TS, bağımlılıksız, istemci ve sunucuda aynı modül.
// Node API'si kullanılmaz (bkz. no-node-api.test.ts).
export { foldTag, toTicker } from './fold';
export { fromLegacyMarkup } from './legacy';
export { countChars, normalizeContent } from './normalize';
export { firstPreviewableUrl, MAX_HASHTAG_LENGTH, parseEntities } from './parse';
export { findActiveTrigger } from './trigger';
export { ENTITY_SCHEMA_VERSION } from './types';
export type {
  ActiveTrigger,
  Entity,
  EntityType,
  ParsedEntity,
  StoredEntities,
  TriggerKind,
} from './types';
export { MAX_URL_LENGTH } from './url';
