import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  Autocomplete,
  type AutocompleteBridge,
  type AutocompleteSession,
  exitAutocomplete,
} from './autocomplete';
import { ComposerHistory, ComposerPlaceholder } from './basics';
import { getDocText } from './doc-text';
import { EntityDecorations } from './entity-decorations';
import { PlainTextPaste } from './plain-text';

/**
 * Editör eklentilerinin jsdom'da (görünümsüz klavye olmadan) davranışı: tetikleme ve kapanışta
 * kod çözümü. Gerçek klavye/IME/konum E2E'de (tests/e2e/composer-*.spec.ts).
 */
const editors: Editor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

const setup = (): { editor: Editor; sessions: (AutocompleteSession | null)[] } => {
  const sessions: (AutocompleteSession | null)[] = [];
  const bridge: AutocompleteBridge = {
    onChange: session => sessions.push(session),
    onClose: () => sessions.push(null),
    onKeyDown: () => false,
    resolveTicker: query => ['THYAO', 'ISCTR'].find(t => t === query.toUpperCase()) ?? null,
  };
  const editor = new Editor({
    element: document.createElement('div'),
    extensions: [
      Document,
      Paragraph,
      Text,
      EntityDecorations,
      Autocomplete.configure({ bridge }),
      PlainTextPaste,
    ],
  });
  editors.push(editor);
  return { editor, sessions };
};

/** Kullanıcı yazması: imlece tek karakterlik ekleme işlemleri. */
const type = (editor: Editor, text: string): void => {
  for (const char of text) {
    const { from, to } = editor.state.selection;
    editor.view.dispatch(editor.state.tr.insertText(char, from, to));
  }
};

const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

describe('autocomplete tetikleme (findActiveTrigger ile)', () => {
  it('$ ile cashtag oturumu açılır, sorgu güncellenir', async () => {
    const { editor, sessions } = setup();
    type(editor, 'Bak $th');
    await flush();
    const last = sessions.at(-1);
    expect(last).toMatchObject({ kind: 'cashtag', query: 'th', textStart: 4 });
  });

  it('kelime ortasında ve URL içinde hiç açılmaz [AC-07]', async () => {
    for (const text of ['mail@ornek.com', 'site.com/#a', 'US$']) {
      const { editor, sessions } = setup();
      type(editor, text);
      await flush();
      expect(sessions.filter(Boolean), text).toEqual([]);
    }
  });

  it('$ tek başına varsayılan listeyi açar, rakam gelince kapanır [AC-07]', async () => {
    const { editor, sessions } = setup();
    type(editor, '$');
    await flush();
    expect(sessions.at(-1)).toMatchObject({ kind: 'cashtag', query: '' });
    type(editor, '5');
    await flush();
    expect(sessions.at(-1)).toBeNull();
  });

  it('boşlukla token kapanır', async () => {
    const { editor, sessions } = setup();
    type(editor, '#bist ');
    await flush();
    expect(sessions.at(-1)).toBeNull();
  });

  it('Esc/exitAutocomplete kapatır; imleç hareketi açmaz, yeni karakter yeniden açar [AC-09]', async () => {
    const { editor, sessions } = setup();
    type(editor, '$th');
    await flush();
    exitAutocomplete(editor.view);
    expect(sessions.at(-1)).toBeNull();
    editor.commands.setTextSelection(2);
    editor.commands.setTextSelection(4);
    expect(sessions.at(-1)).toBeNull();
    type(editor, 'y');
    expect(sessions.at(-1)).toMatchObject({ kind: 'cashtag', query: 'thy' });
  });

  it('tür değişince önceki tür kapanır, yenisi açılır', () => {
    const { editor, sessions } = setup();
    type(editor, '$th #bi');
    const kinds = sessions.map(session => session?.kind ?? null);
    expect(kinds).toContain(null);
    expect(sessions.at(-1)).toMatchObject({ kind: 'hashtag', query: 'bi' });
  });

  it('eşleşen token `cmp-query` dekorasyonu alır', () => {
    const { editor } = setup();
    type(editor, 'a @ay');
    expect(editor.view.dom.querySelector('.cmp-query')?.textContent).toBe('@ay');
  });

  it('kapanışta tam eşleşen cashtag kanonik koda çevrilir [AC-06]', () => {
    const { editor } = setup();
    type(editor, '$thyao ');
    expect(getDocText(editor.state.doc)).toBe('$THYAO ');
    type(editor, '$isctr,');
    expect(getDocText(editor.state.doc)).toBe('$THYAO $ISCTR,');
  });

  it('eşleşmeyen cashtag olduğu gibi kalır', () => {
    const { editor } = setup();
    type(editor, '$thy ');
    expect(getDocText(editor.state.doc)).toBe('$thy ');
  });
});

describe('yapıştırma [CMP-08]', () => {
  it('HTML yerine düz metin eklenir ve normalize edilir', () => {
    const { editor } = setup();
    const data = {
      getData: vi.fn((type: string) =>
        type === 'text/plain' ? 'Kalın‮ metin\nikinci' : '<b>Kalın</b>'
      ),
    };
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    editor.view.dom.dispatchEvent(event);
    expect(getDocText(editor.state.doc)).toBe('Kalın metin\nikinci');
    expect(editor.view.dom.querySelector('b')).toBeNull();
  });
});

describe('placeholder ve geçmiş (ComposerPlaceholder, ComposerHistory)', () => {
  const create = (): Editor => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [
        Document,
        Paragraph,
        Text,
        ComposerHistory,
        ComposerPlaceholder.configure({ placeholder: 'Ne düşünüyorsun?' }),
      ],
    });
    editors.push(editor);
    return editor;
  };

  it('boş editörde ilk paragraf placeholder taşır, yazınca kalkar', () => {
    const editor = create();
    const first = (): Element | null => editor.view.dom.querySelector('p');
    expect(first()?.getAttribute('data-placeholder')).toBe('Ne düşünüyorsun?');
    expect(first()?.classList.contains('is-editor-empty')).toBe(true);
    type(editor, 'a');
    expect(first()?.hasAttribute('data-placeholder')).toBe(false);
  });

  it('Mod-z geri alır, Shift-Mod-z yineler', () => {
    const editor = create();
    type(editor, 'abc');
    const press = (key: string, shiftKey = false): void => {
      editor.view.dom.dispatchEvent(
        new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey, bubbles: true })
      );
    };
    press('z');
    expect(getDocText(editor.state.doc)).toBe('');
    press('z', true);
    expect(getDocText(editor.state.doc)).toBe('abc');
  });
});
