import { describe, expect, it } from 'vitest';

import * as entities from './index';

describe('lib/entities genel API', () => {
  it('ADR-0002 Karar 2 fonksiyonlarını dışa açar', () => {
    for (const name of [
      'normalizeContent',
      'parseEntities',
      'findActiveTrigger',
      'fromLegacyMarkup',
      'countChars',
      'foldTag',
      'toTicker',
      'firstPreviewableUrl',
    ] as const) {
      expect(typeof entities[name]).toBe('function');
    }
  });

  it('şema sürümü ve sınırlar', () => {
    expect(entities.ENTITY_SCHEMA_VERSION).toBe(1);
    expect(entities.MAX_HASHTAG_LENGTH).toBe(50);
    expect(entities.MAX_URL_LENGTH).toBe(2048);
  });

  it('S4 kabulü: toTicker, foldTag ve bidi temizliği', () => {
    expect(entities.toTicker('sise')).toBe('SISE');
    expect(entities.foldTag('BİST100')).toBe('bist100');
    expect(entities.normalizeContent('\u202E$THYAO\u202C')).toBe('$THYAO');
  });

  it('sunucu akışı: normalize → parse uçtan uca', () => {
    const { text, entities: parsed } = entities.fromLegacyMarkup(
      ' $(THYAO) #(BİST100)\r\nbkz. https://kap.org.tr/x. @(ali_1) '
    );
    expect(parsed).toEqual(entities.parseEntities(text));
    expect(parsed.map(e => e.type)).toEqual(['cashtag', 'hashtag', 'url', 'mention']);
    expect(entities.firstPreviewableUrl(entities.parseEntities(text))).toBe('https://kap.org.tr/x');
  });
});
