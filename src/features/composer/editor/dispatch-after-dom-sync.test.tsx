import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { dispatchAfterDomSync } from './dispatch-after-dom-sync';
import { getDocText } from './doc-text';
import { EntityDecorations, entityDecorationsKey } from './entity-decorations';
import { textToDoc } from './use-composer-editor';

// jsdom'da yerleşim yok: ProseMirror'ın seçimi görünür alana kaydırması `Range.getClientRects` ister
beforeAll(() => {
  Range.prototype.getClientRects = (): DOMRectList => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: () => ([] as DOMRect[])[Symbol.iterator](),
  });
  Range.prototype.getBoundingClientRect = (): DOMRect => new DOMRect();
});

const editors: Editor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
  document.body.replaceChildren();
});

const mount = (text: string): Editor => {
  const element = document.createElement('div');
  document.body.append(element);
  const editor = new Editor({
    element,
    content: textToDoc(text),
    extensions: [Document, Paragraph, Text, EntityDecorations.configure({ limit: 500 })],
  });
  editors.push(editor);
  editor.view.focus();
  editor.commands.setTextSelection(1 + text.length);
  return editor;
};

const decorationsMeta = (tickers: ReadonlySet<string>) => ({
  tickers,
  knownUsernames: new Set<string>(),
  limit: 500,
  pendingCashtagStart: null,
});

/** Tarayıcının yerel Backspace'i: yalnızca DOM değişir, ProseMirror henüz okumadı. */
const nativeDeleteLastChar = (editor: Editor): void => {
  const walker = document.createTreeWalker(editor.view.dom, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) last = node as Text;
  if (!last) throw new Error('metin düğümü yok');
  last.data = last.data.slice(0, -1);
};

describe('dispatchAfterDomSync (ENT-E02 kararsızlığı)', () => {
  it('yerel silme okunmadan gelen effect işlemi IndexSizeError fırlatmaz, metin tutarlı kalır', async () => {
    const editor = mount('$THYAO');
    editor.view.dispatch(
      editor.state.tr.setMeta(entityDecorationsKey, decorationsMeta(new Set(['THYAO'])))
    );

    nativeDeleteLastChar(editor);
    // Eski davranış (editor.view.dispatch ile doğrudan) burada IndexSizeError fırlatıyordu
    expect(() =>
      dispatchAfterDomSync(editor, current =>
        current.state.tr.setMeta(entityDecorationsKey, decorationsMeta(new Set<string>()))
      )
    ).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(getDocText(editor.state.doc)).toBe('$THYA');
    expect(editor.view.dom.textContent).toBe('$THYA');
  });

  it('editör yok edildiyse hiçbir şey yapmaz', async () => {
    const editor = mount('abc');
    dispatchAfterDomSync(editor, current => current.state.tr);
    editor.destroy();
    await expect(new Promise(resolve => setTimeout(resolve, 0))).resolves.toBeUndefined();
  });
});
