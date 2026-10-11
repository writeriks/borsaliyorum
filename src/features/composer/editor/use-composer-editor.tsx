'use client';

import { Editor, Extension, type JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { type ReactElement, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Autocomplete, type AutocompleteBridge } from './autocomplete';
import { ComposerHistory, ComposerPlaceholder } from './basics';
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
  /**
   * Kurulumda verilen nitelikler (erişilebilir ad vb.). Görünüm DOM'a takıldığı ilk anda
   * etiketsiz olmasın diye gerekir; sonradan değişenler `editor.setOptions` ile güncellenir.
   */
  initialAttributes: Record<string, string>;
};

/**
 * TipTap editörü (ADR-0002 Karar 3): StarterKit yok; şema yalnızca `doc > paragraph+ > text*`.
 * Hiç mark/node olmadığından yapıştırılan HTML yapısal olarak düz metne düşer.
 *
 * `@tiptap/react` kullanılmaz (composer chunk bütçesi, ADR-0002): React node view'ı yok,
 * editör her işlemde yeniden render istemiyor; gereken tek şey kurulum/yıkım ve DOM'a takma
 * (`ComposerEditorContent`). Editör yalnızca istemcide, effect içinde kurulur (SSR yok).
 */
export const useComposerEditor = (options: ComposerEditorOptions): Editor | null => {
  // Editör bir kez kurulur; geri çağrılar ref üzerinden güncel kalır
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    const initial = latest.current;
    const instance = new Editor({
      // Ayrık bir kapta kurulur; `ComposerEditorContent` görünümü kendi kabına taşır
      content: textToDoc(initial.initialText),
      editorProps: { attributes: initial.initialAttributes },
      extensions: [
        Document,
        Paragraph,
        Text,
        ComposerHistory,
        ComposerPlaceholder.configure({ placeholder: initial.placeholder }),
        EntityDecorations.configure({ limit: initial.limit }),
        Autocomplete.configure({ bridge: initial.bridge }),
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
      onUpdate: ({ editor: current }) => latest.current.onTextChange(current),
      onCreate: ({ editor: current }) => latest.current.onTextChange(current),
      onFocus: () => latest.current.onFocusChange(true),
      onBlur: () => latest.current.onFocusChange(false),
    });
    setEditor(instance);
    return () => {
      instance.destroy();
      setEditor(null);
    };
  }, []);

  return editor;
};

type ComposerEditorContentProps = {
  editor: Editor | null;
  autoFocus?: boolean;
  className?: string;
};

/** Editör görünümünü (contenteditable) bu kabın içine taşır; `autoFocus` ilk takılışta imleci sona koyar. */
export const ComposerEditorContent = ({
  editor,
  autoFocus = false,
  className,
}: ComposerEditorContentProps): ReactElement => {
  const host = useRef<HTMLDivElement | null>(null);
  const focusOnAttach = useRef(autoFocus);
  useLayoutEffect(() => {
    const element = host.current;
    if (!editor || editor.isDestroyed || !element) return;
    const dom = editor.view.dom;
    element.append(dom);
    if (focusOnAttach.current) {
      focusOnAttach.current = false;
      editor.commands.focus('end');
    }
    return () => {
      if (dom.parentNode === element) dom.remove();
    };
  }, [editor]);
  return <div ref={host} className={className} />;
};
