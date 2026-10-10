import { Extension } from '@tiptap/core';
import { Fragment, type Schema, Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { normalizeContent } from '@/lib/entities';

/**
 * Yapıştırılan parçayı normalize eder (kontrol/bidi karakterleri, CRLF, NFC) ama parçanın
 * baş/son boşluklarını korur: `normalizeContent` saklama için trim eder, yapıştırma ortasında
 * bu kelimeleri birbirine yapıştırırdı.
 */
export const normalizePastedText = (raw: string): string => {
  const unified = raw.replace(/\r\n?/g, '\n');
  const leading = /^\s*/u.exec(unified)?.[0] ?? '';
  const trailing = unified.trim() === '' ? '' : (/\s*$/u.exec(unified)?.[0] ?? '');
  const core = normalizeContent(unified);
  return core === '' ? leading.replace(/[^\n ]/g, '') : `${leading}${core}${trailing}`;
};

/** Düz metni şemaya uygun dilime çevirir: her satır bir paragraf. */
export const textToSlice = (schema: Schema, text: string): Slice => {
  const paragraphType = schema.nodes.paragraph;
  if (!paragraphType) return Slice.empty;
  const paragraphs = text
    .split('\n')
    .map(line => paragraphType.create(null, line ? schema.text(line) : undefined));
  // openStart/openEnd 1: ilk ve son satır imlecin bulunduğu paragrafa birleşir
  return new Slice(Fragment.from(paragraphs), 1, 1);
};

/**
 * Her yapıştırma ve bırakma düz metin yolundan geçer ([CMP-08]). Şema zaten yalnızca
 * paragraf+metin içerdiği için HTML yapısal olarak düşerdi; burada ek olarak `text/plain`
 * tercih edilir ve normalize edilir (görünmez/bidi karakter yapıştırılamaz).
 */
export const PlainTextPaste = Extension.create({
  name: 'plainTextPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('plainTextPaste'),
        props: {
          handlePaste: (view, event) => {
            const raw = event.clipboardData?.getData('text/plain') ?? '';
            // Görsel ya da boş pano: görsel yükleme M1'de yok (K10), hiçbir şey eklenmez
            const text = normalizePastedText(raw);
            if (text) {
              view.dispatch(
                view.state.tr
                  .replaceSelection(textToSlice(view.state.schema, text))
                  .scrollIntoView()
              );
            }
            return true;
          },
          clipboardTextParser: (text, _context, _plain, view) =>
            textToSlice(view.state.schema, normalizePastedText(text)),
        },
      }),
    ];
  },
});
