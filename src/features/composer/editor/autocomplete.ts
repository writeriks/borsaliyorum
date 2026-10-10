import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import { Suggestion } from '@tiptap/suggestion';

import { findActiveTrigger, type TriggerKind } from '@/lib/entities';

import { TRIGGER_CHAR } from '../lib/insertion';

import { getParagraphSpans, posToTextOffset } from './doc-text';

export type AutocompleteSession = {
  kind: TriggerKind;
  query: string;
  /** Token'ın doc aralığı: tetikleyici karakterden imlece. */
  from: number;
  to: number;
  /** Tetikleyicinin düz metindeki (`getDocText`) offset'i. */
  textStart: number;
  /** Token'ın ekrandaki konumu (popup'ı `$` karakterine hizalamak için). */
  getRect: () => DOMRect | null;
};

/**
 * Editör eklentisi ile React arayüzü arasındaki köprü. Veri çekme, liste ve seçim React'te;
 * eklenti yalnızca "hangi token açık" bilgisini ve klavye olaylarını iletir.
 */
export type AutocompleteBridge = {
  onChange: (session: AutocompleteSession) => void;
  onClose: (kind: TriggerKind) => void;
  /** `true` dönerse olay tüketilir (ör. liste açıkken ↑/↓/Enter/Tab). */
  onKeyDown: (event: KeyboardEvent) => boolean;
  /** Boşluk/noktalama ile kapanan `$thyao` sorgusunun kanonik kodu (`THYAO`), yoksa `null`. */
  resolveTicker: (query: string) => string | null;
};

const KINDS: readonly TriggerKind[] = ['cashtag', 'hashtag', 'mention'];

export const autocompletePluginKeys: Readonly<Record<TriggerKind, PluginKey>> = {
  cashtag: new PluginKey('ac-cashtag'),
  hashtag: new PluginKey('ac-hashtag'),
  mention: new PluginKey('ac-mention'),
};

const resolveClosedCashtagKey = new PluginKey('ac-resolve-cashtag');

// Token'ı kapatan karakter: boşluk ya da noktalama (tasarım §2.4)
const CLOSING_CHAR_RE = /^[\s\p{P}]$/u;

export const Autocomplete = Extension.create<{ bridge: AutocompleteBridge | null }>({
  name: 'autocomplete',
  // Suggestion'ın Enter/Tab'ı paragraf bölme keymap'inden önce görmesi gerekir
  priority: 1000,

  addOptions() {
    return { bridge: null };
  },

  addProseMirrorPlugins() {
    const { editor } = this;
    const bridge = this.options.bridge;
    if (!bridge) return [];

    const suggestions = KINDS.map(kind =>
      Suggestion({
        editor,
        pluginKey: autocompletePluginKeys[kind],
        char: TRIGGER_CHAR[kind],
        decorationClass: 'cmp-query',
        // Tetikleme kuralı tek kaynaktan: `findActiveTrigger` (ADR-0002, sol sınır + URL içi değil)
        findSuggestionMatch: ({ $position }) => {
          const textBefore = $position.parent.textBetween(
            0,
            $position.parentOffset,
            undefined,
            '￼'
          );
          const trigger = findActiveTrigger(textBefore);
          if (!trigger || trigger.kind !== kind) return null;
          const from = $position.start() + trigger.start;
          return {
            range: { from, to: $position.pos },
            query: trigger.query,
            text: textBefore.slice(trigger.start),
          };
        },
        // `shouldShow` bilinçli olarak yok: Android Gboard her kelimeyi IME kompozisyonu olarak
        // yazar; kompozisyonda liste gizlenirse mobilde hiç açılmaz. Tasarım §2.1'in "tuşlar
        // yakalanmaz" kuralını composer'ın tuş işleyicisindeki `event.isComposing` korur.
        // `Esc` ile kapatılan liste aynı token'a yeni karakter yazılınca yeniden açılır ([AC-09])
        shouldResetDismissed: ({ transaction }) => transaction.docChanged,
        render: () => {
          const emit = (props: { query: string; range: { from: number; to: number } }): void => {
            bridge.onChange({
              kind,
              query: props.query,
              from: props.range.from,
              to: props.range.to,
              textStart: posToTextOffset(getParagraphSpans(editor.state.doc), props.range.from),
              // Tetikleyici karakterin kendi kutusu: popup `$`'ın sol kenarına hizalanır ([AC-20])
              getRect: () => {
                if (editor.isDestroyed) return null;
                const start = editor.view.coordsAtPos(props.range.from, 1);
                return new DOMRect(start.left, start.top, 1, start.bottom - start.top);
              },
            });
          };
          return {
            onStart: emit,
            onUpdate: emit,
            onExit: () => bridge.onClose(kind),
            onKeyDown: ({ event }) => (event.key === 'Escape' ? false : bridge.onKeyDown(event)),
          };
        },
      })
    );

    // `$thyao` + boşluk → `$THYAO ` ([AC-06]); yalnızca tek karakterlik yazma işlemlerinde
    const resolveClosedCashtag = new Plugin({
      key: resolveClosedCashtagKey,
      appendTransaction: (transactions, _oldState, newState) => {
        const tr = transactions.at(-1);
        if (!tr?.docChanged || transactions.length !== 1 || tr.steps.length !== 1) return null;
        const step = tr.steps[0];
        if (!(step instanceof ReplaceStep)) return null;
        const json = step.toJSON() as { from: number; to: number };
        const inserted = step.slice.content.textBetween(0, step.slice.content.size);
        if (json.from !== json.to || !CLOSING_CHAR_RE.test(inserted)) return null;

        const $pos = newState.doc.resolve(json.from);
        const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '￼');
        const trigger = findActiveTrigger(textBefore);
        if (trigger?.kind !== 'cashtag' || !trigger.query) return null;
        const ticker = bridge.resolveTicker(trigger.query);
        if (!ticker || ticker === trigger.query) return null;
        const from = $pos.start() + trigger.start + 1;
        return newState.tr.insertText(ticker, from, json.from);
      },
    });

    return [...suggestions, resolveClosedCashtag];
  },
});
