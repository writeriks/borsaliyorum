import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Autocomplete, type AutocompleteBridge, type AutocompleteSession } from './autocomplete';
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
