import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * design-system: boşluk ölçeği 4px tabanlı (4, 8, 12, 16, 24, 32, 48). Tailwind'de 1 birim
 * 4px olduğundan boşluk sınıflarında izinli katsayılar aşağıdakiler. Boyut sınıflarında
 * (h/w/size) ölçek daha geniş ama yarım birim (2px, 6px, 10px, 14px) yine ölçek dışı.
 */
const SPACING_STEPS = new Set(['0', '1', '2', '3', '4', '6', '8', '12']);
const SPACING_PREFIX =
  /^-?(?:gap(?:-[xy])?|p[xytrbl]?|m[xytrbl]?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left)$/;
const SIZING_PREFIX = /^(?:h|w|size|min-h|min-w|max-h|max-w)$/;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIRS = ['ui', 'states', 'shell'] as const;

const offScaleClasses = (source: string): string[] => {
  const found: string[] = [];
  for (const [, token = ''] of source.matchAll(/[\s'"`]([a-z:[\]-]*-\d+(?:\.\d+)?)(?=[\s'"`])/g)) {
    // `md:gap-2` gibi varyantlardan yalnızca yardımcıyı al
    const utility = token.split(':').at(-1) ?? '';
    const match = /^(-?[a-z-]+?)-(\d+(?:\.\d+)?)$/.exec(utility);
    if (!match) continue;
    const [, prefix = '', step = ''] = match;
    if (SPACING_PREFIX.test(prefix) && !SPACING_STEPS.has(step)) found.push(token);
    if (SIZING_PREFIX.test(prefix) && step.includes('.')) found.push(token);
  }
  return found;
};

describe('boşluk ölçeği', () => {
  it('kontrol mantığı ölçek dışı sınıfları yakalar', () => {
    expect(offScaleClasses(`'gap-1.5 py-1.5 h-2.5 md:px-5 pr-9 gap-2 h-10 size-hit'`)).toEqual([
      'gap-1.5',
      'py-1.5',
      'h-2.5',
      'md:px-5',
      'pr-9',
    ]);
  });

  for (const dir of DIRS) {
    const files = readdirSync(join(ROOT, dir)).filter(
      name => name.endsWith('.tsx') && !name.includes('.test.')
    );
    it.each(files)(`${dir}/%s ölçek dışı boşluk sınıfı içermez`, file => {
      expect(offScaleClasses(readFileSync(join(ROOT, dir, file), 'utf8'))).toEqual([]);
    });
  }
});
