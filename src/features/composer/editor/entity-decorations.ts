import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { parseEntities } from '@/lib/entities';

import { getDocText, getParagraphSpans, graphemeLimitOffset, textOffsetToPos } from './doc-text';

export type EntityDecorationOptions = {
  /** Hisse indeksi; `null` = yüklenmedi (cashtag'ler ne vurgulanır ne işaretlenir). */
  tickers: ReadonlySet<string> | null;
  /** Autocomplete'te görülmüş (var olduğu bilinen) kullanıcı adları, küçük harf. */
  knownUsernames: ReadonlySet<string>;
  /** Grafem sınırı; aşan kısım `data-overflow` ile işaretlenir (metin kesilmez). */
  limit: number;
  /**
   * Autocomplete'i açık cashtag token'ının düz metin başlangıcı: yazılırken (`$th`) henüz
   * "bilinmeyen" sayılmaz; liste kapanınca işaretlenir.
   */
  pendingCashtagStart: number | null;
};

type PluginState = { options: EntityDecorationOptions; decorations: DecorationSet };

export const entityDecorationsKey = new PluginKey<PluginState>('entityDecorations');

/**
 * Doc'u değiştirmeden vurgu: her değişiklikte düz metin sunucuyla **aynı** `parseEntities`'ten
 * geçer ve `Decoration.inline` üretilir (ADR-0002 Karar 3). Entity'ler atomik değil; Backspace
 * tek karakter siler, token tekrar sorguya döner ([ENT-E02]).
 */
export const buildEntityDecorations = (
  doc: PMNode,
  options: EntityDecorationOptions
): DecorationSet => {
  const spans = getParagraphSpans(doc);
  const text = getDocText(doc);
  const decorations: Decoration[] = [];
  const inline = (start: number, end: number, attrs: Record<string, string>): void => {
    decorations.push(
      Decoration.inline(textOffsetToPos(spans, start), textOffsetToPos(spans, end), attrs)
    );
  };

  for (const entity of parseEntities(text)) {
    switch (entity.type) {
      case 'cashtag':
        if (options.tickers === null) break;
        if (options.tickers.has(entity.ticker)) {
          inline(entity.start, entity.end, { class: 'cmp-entity', 'data-entity': 'cashtag' });
        } else if (entity.start !== options.pendingCashtagStart) {
          // K5: bilinmeyen cashtag gönderiyi reddeder → yazarken işaretlenir (entity stili yok)
          inline(entity.start, entity.end, { class: 'cmp-unknown', 'data-entity': 'unknown' });
        }
        break;
      case 'hashtag':
        inline(entity.start, entity.end, { class: 'cmp-entity', 'data-entity': 'hashtag' });
        break;
      case 'mention':
        if (options.knownUsernames.has(entity.username)) {
          inline(entity.start, entity.end, { class: 'cmp-entity', 'data-entity': 'mention' });
        }
        break;
      case 'url':
        inline(entity.start, entity.end, { class: 'cmp-url', 'data-entity': 'url' });
        break;
    }
  }

  const overflowFrom = graphemeLimitOffset(text, options.limit);
  if (overflowFrom !== null) {
    // Paragraf sınırında tek dekorasyon iki span'e bölünür; her paragraf ayrı eklenir
    for (const span of spans) {
      const start = Math.max(overflowFrom, span.offset);
      const end = span.offset + span.text.length;
      if (start < end) inline(start, end, { class: 'cmp-overflow', 'data-overflow': 'true' });
    }
  }

  return DecorationSet.create(doc, decorations);
};

const DEFAULT_OPTIONS: EntityDecorationOptions = {
  tickers: null,
  knownUsernames: new Set(),
  limit: 1000,
  pendingCashtagStart: null,
};

export const EntityDecorations = Extension.create<{ limit: number }>({
  name: 'entityDecorations',

  addOptions() {
    return { limit: DEFAULT_OPTIONS.limit };
  },

  addProseMirrorPlugins() {
    const initial: EntityDecorationOptions = { ...DEFAULT_OPTIONS, limit: this.options.limit };
    return [
      new Plugin<PluginState>({
        key: entityDecorationsKey,
        state: {
          init: (_config, state) => ({
            options: initial,
            decorations: buildEntityDecorations(state.doc, initial),
          }),
          apply: (tr, previous, _oldState, newState) => {
            const meta = tr.getMeta(entityDecorationsKey) as
              Partial<EntityDecorationOptions> | undefined;
            if (!meta && !tr.docChanged) return previous;
            const options = meta ? { ...previous.options, ...meta } : previous.options;
            return { options, decorations: buildEntityDecorations(newState.doc, options) };
          },
        },
        props: {
          decorations: state => entityDecorationsKey.getState(state)?.decorations ?? null,
        },
      }),
    ];
  },
});
