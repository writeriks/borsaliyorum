import { describe, expect, it } from 'vitest';

import { findActiveTrigger } from '@/lib/entities';

import { computeSelectionReplacement, computeTriggerInsertion } from './insertion';

const apply = (text: string, r: { from: number; to: number; text: string }): string =>
  text.slice(0, r.from) + r.text + text.slice(r.to);

/** `|` imleç; tetikleyici `findActiveTrigger` ile bulunur (editörle aynı yol). */
const select = (withCaret: string, value: string): { text: string; caret: number } => {
  const caret = withCaret.indexOf('|');
  const text = withCaret.replace('|', '');
  const trigger = findActiveTrigger(text.slice(0, caret));
  if (!trigger) throw new Error(`tetikleyici yok: ${withCaret}`);
  const r = computeSelectionReplacement({
    paragraphText: text,
    triggerStart: trigger.start,
    caret,
    kind: trigger.kind,
    value,
  });
  return { text: apply(text, r), caret: r.caret };
};

describe('computeSelectionReplacement (tasarım §2.4)', () => {
  it('kanonik değer + tek boşluk; imleç boşluktan sonra [AC-05]', () => {
    expect(select('$isctr|', 'ISCTR')).toEqual({ text: '$ISCTR ', caret: 7 });
  });

  it('sonrasında boşluk varsa ikinci boşluk eklenmez [AC-22]', () => {
    const result = select('$th| dedi', 'THYAO');
    expect(result.text).toBe('$THYAO dedi');
    expect(result.caret).toBe(7);
  });

  it('imleç token ortasındaysa token’ın devamı da değişir', () => {
    expect(select('$th|y sonra', 'THYAO').text).toBe('$THYAO sonra');
  });

  it('noktalama token’ı bitirir; noktalama korunur', () => {
    expect(select('($th|) iyi', 'THYAO').text).toBe('($THYAO ) iyi');
  });

  it('hashtag ve mention', () => {
    expect(select('Bugün #bi|', 'bist100').text).toBe('Bugün #bist100 ');
    expect(select('@ay| naber', 'aysek').text).toBe('@aysek naber');
  });

  it('satır sonu da boşluk sayılır', () => {
    expect(select('$th|\n', 'THYAO').text).toBe('$THYAO\n');
  });
});

describe('computeTriggerInsertion [CMP-05]', () => {
  it('boş editörde yalnızca tetikleyici', () => {
    expect(computeTriggerInsertion('', 'cashtag')).toBe('$');
  });

  it('imleçten önce boşluk dışı karakter varsa önce boşluk', () => {
    expect(computeTriggerInsertion('abc', 'cashtag')).toBe(' $');
    expect(computeTriggerInsertion('abc', 'hashtag')).toBe(' #');
    expect(computeTriggerInsertion('abc', 'mention')).toBe(' @');
  });

  it('boşluk ya da açılış parantezinden sonra boşluk eklenmez', () => {
    expect(computeTriggerInsertion('abc ', 'cashtag')).toBe('$');
    expect(computeTriggerInsertion('(', 'cashtag')).toBe('$');
  });

  it('eklenen metin tetiklemeyi başlatır', () => {
    for (const before of ['', 'abc', 'abc ', 'x.']) {
      const text = before + computeTriggerInsertion(before, 'cashtag');
      expect(findActiveTrigger(text)?.kind).toBe('cashtag');
    }
  });
});
