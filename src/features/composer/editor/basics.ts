import { Extension } from '@tiptap/core';
import { history, redo, undo } from '@tiptap/pm/history';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * `@tiptap/extensions` (Placeholder, UndoRedo) yerine composer'a yetecek en küçük karşılıklar:
 * composer chunk bütçesi (ADR-0002 Karar 3, ≤ 100 KB gz). Davranış aynı: boş editörde ilk
 * paragrafa `is-editor-empty` + `data-placeholder`; `Mod-z` / `Shift-Mod-z` / `Mod-y` geçmiş.
 */
export const ComposerPlaceholder = Extension.create<{ placeholder: string }>({
  name: 'composerPlaceholder',

  addOptions() {
    return { placeholder: '' };
  },

  addProseMirrorPlugins() {
    const { placeholder } = this.options;
    return [
      new Plugin({
        key: new PluginKey('composerPlaceholder'),
        props: {
          decorations: ({ doc }) => {
            const first = doc.firstChild;
            if (doc.childCount !== 1 || !first || first.content.size > 0) return null;
            return DecorationSet.create(doc, [
              Decoration.node(0, first.nodeSize, {
                class: 'is-empty is-editor-empty',
                'data-placeholder': placeholder,
              }),
            ]);
          },
        },
      }),
    ];
  },
});

export const ComposerHistory = Extension.create({
  name: 'composerHistory',

  addProseMirrorPlugins() {
    return [history({ depth: 100, newGroupDelay: 500 })];
  },

  addKeyboardShortcuts() {
    const run = (command: typeof undo): boolean =>
      command(this.editor.state, this.editor.view.dispatch);
    return {
      'Mod-z': () => run(undo),
      'Shift-Mod-z': () => run(redo),
      'Mod-y': () => run(redo),
    };
  },
});
