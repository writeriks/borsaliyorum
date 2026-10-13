import { parseEntities } from './parse';
import type { ParsedEntity } from './types';

export type EntitySummary = { type: ParsedEntity['type']; text: string; value: string };

const valueOf = (entity: ParsedEntity): string => {
  switch (entity.type) {
    case 'cashtag':
      return entity.ticker;
    case 'hashtag':
      return entity.slug;
    case 'mention':
      return entity.username;
    case 'url':
      return entity.href;
  }
};

/** Testlerde okunaklı karşılaştırma: tür, metindeki görünüm ve kanonik değer. */
export const summarize = (text: string): EntitySummary[] =>
  parseEntities(text).map(entity => ({
    type: entity.type,
    text: text.slice(entity.start, entity.end),
    value: valueOf(entity),
  }));
