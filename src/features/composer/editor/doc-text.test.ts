import { getSchema } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { describe, expect, it } from 'vitest';

import {
  getDocText,
  getParagraphSpans,
  graphemeLimitOffset,
  posToTextOffset,
  textOffsetToPos,
} from './doc-text';
import { buildEntityDecorations } from './entity-decorations';
import { MAX_PASTE_CHARS, normalizePastedText, textToSlice } from './plain-text';
import { textToDoc } from './use-composer-editor';

const schema = getSchema([Document, Paragraph, Text]);
const docOf = (text: string) => schema.nodeFromJSON(textToDoc(text));

describe('doc ↔ düz metin', () => {
  it('paragraflar \\n ile birleşir (saklama formatı)', () => {
    expect(getDocText(docOf('a\n\nb $THYAO'))).toBe('a\n\nb $THYAO');
  });

  it('offset ↔ pozisyon eşlemesi gidiş-dönüş tutarlı', () => {
    const doc = docOf('ab\ncd');
    const spans = getParagraphSpans(doc);
    // "ab" → pos 1..3, "cd" → pos 5..7
    expect(textOffsetToPos(spans, 0)).toBe(1);
    expect(textOffsetToPos(spans, 2)).toBe(3);
    expect(textOffsetToPos(spans, 3)).toBe(5);
    expect(textOffsetToPos(spans, 5)).toBe(7);
    for (let offset = 0; offset <= 5; offset += 1) {
      expect(posToTextOffset(spans, textOffsetToPos(spans, offset))).toBe(offset);
    }
  });

  it('grafem sınırı offset’i: emoji bölünmez', () => {
    expect(graphemeLimitOffset('abc', 2)).toBe(2);
    expect(graphemeLimitOffset('a👨‍👩‍👧b', 2)).toBe('a👨‍👩‍👧'.length);
    expect(graphemeLimitOffset('ab', 2)).toBeNull();
  });
});

describe('buildEntityDecorations (tek parser, ADR-0002 Karar 3)', () => {
  const attrsOf = (
    text: string,
    options: Partial<Parameters<typeof buildEntityDecorations>[1]> = {}
  ) => {
    const doc = docOf(text);
    const set = buildEntityDecorations(doc, {
      tickers: new Set(['THYAO']),
      knownUsernames: new Set(['aysek']),
      limit: 1000,
      pendingCashtagStart: null,
      ...options,
    });
    return set.find().map(deco => {
      const spec = deco as unknown as { type: { attrs: Record<string, string> } };
      return {
        text: doc.textBetween(deco.from, deco.to),
        entity:
          spec.type.attrs['data-entity'] ?? (spec.type.attrs['data-overflow'] ? 'overflow' : ''),
      };
    });
  };

  it('tanınmış cashtag, hashtag, bilinen mention ve URL vurgulanır', () => {
    expect(attrsOf('$THYAO #bist100 @aysek @bilinmez https://x.com/a')).toEqual([
      { text: '$THYAO', entity: 'cashtag' },
      { text: '#bist100', entity: 'hashtag' },
      { text: '@aysek', entity: 'mention' },
      { text: 'https://x.com/a', entity: 'url' },
    ]);
  });

  it('bilinmeyen cashtag ayrı işaretlenir; yazılmaktaysa işaretlenmez [ENT-E03]', () => {
    expect(attrsOf('$ZZZZ ')).toEqual([{ text: '$ZZZZ', entity: 'unknown' }]);
    expect(attrsOf('$ZZ', { pendingCashtagStart: 0 })).toEqual([]);
  });

  it('indeks yokken cashtag hiç vurgulanmaz', () => {
    expect(attrsOf('$THYAO', { tickers: null })).toEqual([]);
  });

  it('sınırı aşan kısım paragraf bazında işaretlenir, metin kesilmez [CNT-03]', () => {
    const marks = attrsOf('aaaa\nbbbb', { limit: 3 }).filter(m => m.entity === 'overflow');
    expect(marks.map(m => m.text)).toEqual(['a', 'bbbb']);
  });
});

describe('düz metin yapıştırma [CMP-08]', () => {
  it('kontrol ve bidi karakterleri temizlenir, kenar boşlukları korunur', () => {
    expect(normalizePastedText(' $TH​YAO‮ ')).toBe(' $THYAO ');
    expect(normalizePastedText('a\r\nb')).toBe('a\nb');
  });

  it('tek yapıştırma 20.000 karakterde kırpılır, vekil çift bölünmez', () => {
    expect(MAX_PASTE_CHARS).toBe(20_000);
    expect(normalizePastedText('a'.repeat(25_000))).toHaveLength(20_000);
    const emojiAtEdge = `${'a'.repeat(19_999)}😀b`;
    expect(normalizePastedText(emojiAtEdge)).toBe('a'.repeat(19_999));
  });

  it('her satır bir paragraf olur', () => {
    const slice = textToSlice(schema, 'bir\niki');
    expect(slice.content.childCount).toBe(2);
    expect(slice.content.textBetween(0, slice.content.size, '\n')).toBe('bir\niki');
  });
});
