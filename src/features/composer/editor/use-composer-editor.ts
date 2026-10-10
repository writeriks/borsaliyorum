'use client';

import { Extension, type JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import { type Editor, useEditor } from '@tiptap/react';
import { useLayoutEffect, useRef } from 'react';

import { Autocomplete, type AutocompleteBridge } from './autocomplete';
import { EntityDecorations } from './entity-decorations';
import { PlainTextPaste } from './plain-text';

/** Düz metni doc JSON'una çevirir: her satır bir paragraf (taslak geri yükleme). */
export const textToDoc = (text: string): JSONContent => ({
  type: 'doc',
  content: text.split('\n').map(line => ({
    type: 'paragraph',
    content: line ? [{ type: 'text', text: line }] : [],
  })),
});

type ComposerEditorOptions = {
  initialText: string;
  placeholder: string;
  limit: number;
  bridge: AutocompleteBridge;
  onSubmitShortcut: () => void;
  onTextChange: (editor: Editor) => void;
  onFocusChange: (focused: boolean) => void;
  autoFocus: boolean;
};

/**
 * TipTap editörü (ADR-0002 Karar 3): StarterKit yok; şema yalnızca `doc > paragraph+ > text*`.
 * Hiç mark/node olmadığından yapıştırılan HTML yapısal olarak düz metne düşer. SSR'da render
 * edilmez (`immediatelyRender: false`); composer zaten lazy yüklenir.
 */
export const useComposerEditor = (options: ComposerEditorOptions): Editor | null => {
  // Editör bir kez kurulur; geri çağrılar ref üzerinden güncel kalır
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });

  return useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    autofocus: options.autoFocus ? 'end' : false,
    content: textToDoc(options.initialText),
    extensions: [
      Document,
      Paragraph,
      Text,
      UndoRedo,
      Placeholder.configure({ placeholder: options.placeholder }),
      EntityDecorations.configure({ limit: options.limit }),
      Autocomplete.configure({ bridge: options.bridge }),
      PlainTextPaste,
      Extension.create({
        name: 'submitShortcut',
        addKeyboardShortcuts: () => ({
          // [CMP-07] Ctrl/Cmd+Enter: geçerliyse gönderir, değilse hiçbir şey yapmaz
          'Mod-Enter': () => {
            latest.current.onSubmitShortcut();
            return true;
          },
        }),
      }),
    ],
    onUpdate: ({ editor }) => latest.current.onTextChange(editor),
    onCreate: ({ editor }) => latest.current.onTextChange(editor),
    onFocus: () => latest.current.onFocusChange(true),
    onBlur: () => latest.current.onFocusChange(false),
  });
};
