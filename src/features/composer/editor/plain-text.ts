import { Extension } from '@tiptap/core';
import { Fragment, type Schema, Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

import { normalizeContent } from '@/lib/entities';

/**
 * Tek yapıştırma/bırakmada eklenebilecek en fazla UTF-16 birimi. Sınır 1000 grafem; daha uzun
 * metin aşım işaretiyle düzenlenebilsin diye kesilmez, ama megabaytlık pano (yanlışlıkla bir
 * dosya içeriği) her tuşta yeniden parse edilip editörü kilitlemesin ve taslak şemasının
 * (`text.max(20_000)`) dışına çıkmasın.
 */
export const MAX_PASTE_CHARS = 20_000;

const truncatePasted = (text: string): string => {
  if (text.length <= MAX_PASTE_CHARS) return text;
  const cut = text.slice(0, MAX_PASTE_CHARS);
  // Vekil çiftin (emoji) yarısı kalmasın
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
};

/**
 * Yapıştırılan parçayı normalize eder (kontrol/bidi karakterleri, CRLF, NFC) ama parçanın
 * baş/son boşluklarını korur: `normalizeContent` saklama için trim eder, yapıştırma ortasında
 * bu kelimeleri birbirine yapıştırırdı. Sonuç `MAX_PASTE_CHARS`'ta kırpılır.
 */
export const normalizePastedText = (raw: string): string => {
  // Normalize etmeden önce de kırp: çok büyük girdide regex/NFC maliyeti sınırlı kalsın
  const unified = truncatePasted(raw).replace(/\r\n?/g, '\n');
  const leading = /^\s*/u.exec(unified)?.[0] ?? '';
  const trailing = unified.trim() === '' ? '' : (/\s*$/u.exec(unified)?.[0] ?? '');
  const core = normalizeContent(unified);
  return truncatePasted(
    core === '' ? leading.replace(/[^\n ]/g, '') : `${leading}${core}${trailing}`
  );
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

/** Bırakılan/yapıştırılan dilimin düz metni (paragraflar satır sonuyla). */
const sliceText = (slice: Slice): string =>
  slice.content.textBetween(0, slice.content.size, '\n', '\n');

/**
 * Her yapıştırma ve bırakma düz metin yolundan geçer ([CMP-08]). Şema zaten yalnızca
 * paragraf+metin içerdiği için HTML yapısal olarak düşerdi; burada ek olarak `text/plain`
 * tercih edilir ve normalize edilir (görünmez/bidi karakter yapıştırılamaz). Bırakmada
 * (`drop`) ProseMirror yalnızca `text/html` varsa HTML ayrıştırıcısını normalize etmeden
 * kullanıyordu: `handleDrop` aynı yolu zorlar.
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
          handleDrop: (view, event, slice, moved) => {
            // Editör içi taşıma: içerik zaten normalize, ProseMirror'ın taşıma mantığı kalsın
            if (moved) return false;
            const plain = event.dataTransfer?.getData('text/plain') ?? '';
            const text = normalizePastedText(plain || sliceText(slice));
            const target = view.posAtCoords({ left: event.clientX, top: event.clientY });
            event.preventDefault();
            if (!text || !target) return true;
            const tr = view.state.tr;
            tr.setSelection(TextSelection.near(tr.doc.resolve(target.pos)));
            tr.replaceSelection(textToSlice(view.state.schema, text)).scrollIntoView();
            view.dispatch(tr);
            view.focus();
            return true;
          },
          clipboardTextParser: (text, _context, _plain, view) =>
            textToSlice(view.state.schema, normalizePastedText(text)),
        },
      }),
    ];
  },
});
