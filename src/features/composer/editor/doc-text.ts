import type { Node as PMNode } from '@tiptap/pm/model';

/**
 * Şema yalnızca `doc > paragraph+ > text*` (ADR-0002 Karar 3). Düz metin = paragraflar `\n`
 * ile birleşir; saklama formatıyla birebir. Bu modül düz metin offset'i ↔ doc pozisyonu eşler.
 */
export type ParagraphSpan = {
  /** Paragraf içeriğinin doc'taki başlangıç pozisyonu. */
  pos: number;
  /** Düz metindeki başlangıç offset'i (UTF-16). */
  offset: number;
  text: string;
};

export const getParagraphSpans = (doc: PMNode): ParagraphSpan[] => {
  const spans: ParagraphSpan[] = [];
  let offset = 0;
  doc.forEach((node, nodeOffset) => {
    // `forEach` offset'i doc içeriğine göre; paragrafın içeriği bir sonraki pozisyonda başlar
    const text = node.textContent;
    spans.push({ pos: nodeOffset + 1, offset, text });
    offset += text.length + 1;
  });
  return spans;
};

export const getDocText = (doc: PMNode): string =>
  getParagraphSpans(doc)
    .map(span => span.text)
    .join('\n');

/**
 * Düz metin offset'ini doc pozisyonuna çevirir. Paragraf sonundaki `\n` offset'i o paragrafın
 * sonuna eşlenir. Aralık dışı offset'ler doc sınırlarına sabitlenir.
 */
export const textOffsetToPos = (spans: readonly ParagraphSpan[], offset: number): number => {
  let last: ParagraphSpan | undefined;
  for (const span of spans) {
    if (offset <= span.offset + span.text.length) {
      return span.pos + Math.max(0, offset - span.offset);
    }
    last = span;
  }
  return last ? last.pos + last.text.length : 0;
};

/** Doc pozisyonunu düz metin offset'ine çevirir (`textOffsetToPos`'un tersi). */
export const posToTextOffset = (spans: readonly ParagraphSpan[], pos: number): number => {
  let result = 0;
  for (const span of spans) {
    if (pos < span.pos) break;
    result = span.offset + Math.min(pos - span.pos, span.text.length);
  }
  return result;
};

/** UTF-16 offset'inden önceki grafem sayısının `limit`'e ulaştığı offset (aşım işareti başlangıcı). */
export const graphemeLimitOffset = (text: string, limit: number): number | null => {
  const segmenter = new Intl.Segmenter('tr', { granularity: 'grapheme' });
  let count = 0;
  for (const { index } of segmenter.segment(text)) {
    if (count === limit) return index;
    count += 1;
  }
  return null;
};
