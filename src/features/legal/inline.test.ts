import { describe, expect, it } from 'vitest';

import { parseLegalInline } from './inline';

describe('parseLegalInline', () => {
  it('düz metin tek token', () => {
    expect(parseLegalInline('Merhaba dünya.')).toEqual([{ kind: 'text', text: 'Merhaba dünya.' }]);
  });

  it('kalın, yer tutucu, belge bağlantısı ve destek e-postası', () => {
    expect(
      parseLegalInline(
        '**Not:** [[ph:company]] için [[link:cookies|Çerez Politikası]] ve [[mail:support]].'
      )
    ).toEqual([
      { kind: 'bold', text: 'Not:' },
      { kind: 'text', text: ' ' },
      { kind: 'placeholder', key: 'company' },
      { kind: 'text', text: ' için ' },
      { kind: 'link', doc: 'cookies', label: 'Çerez Politikası' },
      { kind: 'text', text: ' ve ' },
      { kind: 'mail' },
      { kind: 'text', text: '.' },
    ]);
  });

  it.each([
    ['bilinmeyen yer tutucu', '[[ph:yok]]'],
    ['bilinmeyen belge', '[[link:gizli|X]]'],
    ['etiketsiz belge bağlantısı', '[[link:terms]]'],
    ['bilinmeyen tür', '[[url:https://example.com|X]]'],
    ['bilinmeyen e-posta', '[[mail:kvkk]]'],
    ['kapanmamış işaret', 'metin [[ph:company'],
  ])('%s → hata (sessizce ham metin basılmaz)', (_name, source) => {
    expect(() => parseLegalInline(source)).toThrow();
  });
});
