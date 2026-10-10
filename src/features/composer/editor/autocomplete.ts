import { Extension } from '@tiptap/core';
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

import { findActiveTrigger, type TriggerKind } from '@/lib/entities';

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

const resolveClosedCashtagKey = new PluginKey('ac-resolve-cashtag');

// Token'ı kapatan karakter: boşluk ya da noktalama (tasarım §2.4)
const CLOSING_CHAR_RE = /^[\s\p{P}]$/u;

type AcMatch = { kind: TriggerKind; query: string; from: number; to: number };

type AcState = {
  match: AcMatch | null;
  /** `Esc` ile kapatılan token'ın başlangıcı: belge değişene kadar aynı token yeniden açılmaz. */
  dismissedFrom: number | null;
};

const autocompleteKey = new PluginKey<AcState>('autocomplete');

const EXIT_META = 'exit';

/**
 * Açık listeyi kapatır (Esc ile aynı: aynı token'a yeni karakter yazılınca yeniden açılır).
 * Dialog Esc'i kendisi yakaladığında composer bunu çağırır ([CMP-09]).
 */
export const exitAutocomplete = (view: EditorView): void => {
  view.dispatch(view.state.tr.setMeta(autocompleteKey, EXIT_META));
};

/** İmleç önündeki metinden aktif token (tek kaynak `findActiveTrigger`, ADR-0002). */
const findMatch = (state: EditorState): AcMatch | null => {
  const { selection } = state;
  if (!selection.empty) return null;
  const { $from } = selection;
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
  const trigger = findActiveTrigger(textBefore);
  if (!trigger) return null;
  return {
    kind: trigger.kind,
    query: trigger.query,
    from: $from.start() + trigger.start,
    to: $from.pos,
  };
};

const sameMatch = (a: AcMatch | null, b: AcMatch | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.kind === b.kind &&
    a.query === b.query &&
    a.from === b.from &&
    a.to === b.to);

export const Autocomplete = Extension.create<{ bridge: AutocompleteBridge | null }>({
  name: 'autocomplete',
  // Liste açıkken Enter/Tab'ı paragraf bölme keymap'inden önce görmesi gerekir
  priority: 1000,

  addOptions() {
    return { bridge: null };
  },

  addProseMirrorPlugins() {
    const { editor } = this;
    const bridge = this.options.bridge;
    if (!bridge) return [];

    // `@tiptap/suggestion` yerine: tek eklenti, üç tetikleyici. Popup/konum/veri React'te
    // olduğundan Suggestion'ın kendi render/floating-ui katmanına ihtiyaç yoktu (composer chunk
    // bütçesi). IME kompozisyonu sürerken de güncellenir: Gboard her kelimeyi kompozisyonla yazar
    // ([AC-24]); tuş yakalamayı composer'daki `event.isComposing` kontrolü engeller.
    const autocomplete = new Plugin<AcState>({
      key: autocompleteKey,
      state: {
        init: (_config, state) => ({ match: findMatch(state), dismissedFrom: null }),
        apply: (tr, previous, _oldState, newState) => {
          if (tr.getMeta(autocompleteKey) === EXIT_META) {
            return { match: null, dismissedFrom: previous.match?.from ?? previous.dismissedFrom };
          }
          const match = editor.isEditable ? findMatch(newState) : null;
          // Belge değişince (yeni karakter) ya da başka bir token'a geçilince kapatma düşer ([AC-09])
          const dismissedFrom =
            tr.docChanged || match?.from !== previous.dismissedFrom ? null : previous.dismissedFrom;
          return { match: dismissedFrom === null ? match : null, dismissedFrom };
        },
      },
      props: {
        decorations: state => {
          const match = autocompleteKey.getState(state)?.match;
          return match
            ? DecorationSet.create(state.doc, [
                Decoration.inline(match.from, match.to, { class: 'cmp-query' }),
              ])
            : null;
        },
        handleKeyDown: (view, event) => {
          if (!autocompleteKey.getState(view.state)?.match) return false;
          if (event.key === 'Escape' && !event.isComposing) {
            exitAutocomplete(view);
            return true;
          }
          return bridge.onKeyDown(event);
        },
      },
      view: () => {
        let open: AcMatch | null = null;
        return {
          update: view => {
            const match = autocompleteKey.getState(view.state)?.match ?? null;
            if (sameMatch(open, match)) return;
            if (open && (!match || match.kind !== open.kind)) bridge.onClose(open.kind);
            open = match;
            if (!match) return;
            bridge.onChange({
              kind: match.kind,
              query: match.query,
              from: match.from,
              to: match.to,
              textStart: posToTextOffset(getParagraphSpans(view.state.doc), match.from),
              // Tetikleyici karakterin kendi kutusu: popup `$`'ın sol kenarına hizalanır ([AC-20])
              getRect: () => {
                if (editor.isDestroyed) return null;
                const start = editor.view.coordsAtPos(match.from, 1);
                return new DOMRect(start.left, start.top, 1, start.bottom - start.top);
              },
            });
          },
          destroy: () => {
            if (open) bridge.onClose(open.kind);
            open = null;
          },
        };
      },
    });

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

    return [autocomplete, resolveClosedCashtag];
  },
});
