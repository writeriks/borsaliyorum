import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { contrastRatio, parseHslTriplet } from '@/lib/color/contrast';

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

const readBlock = (selector: string): Record<string, string> => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (!match?.[1]) throw new Error(`${selector} bloğu tokens.css'te yok`);
  const body = match[1].replace(/\/\*[\s\S]*?\*\//g, '');
  return Object.fromEntries(
    [...body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, name = '', value = '']) => [
      name,
      value.trim(),
    ])
  );
};

const themes = { light: readBlock(':root'), dark: readBlock('.dark') } as const;

/** design-system skill'indeki sabit isimler + tasarım dokümanındaki eklemeler (✚) */
const COLOR_TOKENS = [
  'bg',
  'bg-subtle',
  'bg-elevated',
  'bg-muted',
  'overlay',
  'fg',
  'fg-muted',
  'fg-subtle',
  'border',
  'border-strong',
  'accent',
  'accent-fg',
  'accent-subtle',
  'up',
  'up-bg',
  'down',
  'down-bg',
  'success',
  'info',
  'warn',
  'warn-bg',
  'danger',
  'danger-bg',
  'focus-ring',
] as const;

type ColorToken = (typeof COLOR_TOKENS)[number];

const TEXT = 4.5;
const NON_TEXT = 3;

/** [ön plan, zemin, eşik] — docs/design/v2-design-system.md §2.2 ve sistem durumları */
const PAIRS: readonly (readonly [ColorToken, ColorToken, number])[] = [
  ['fg', 'bg', TEXT],
  ['fg', 'bg-subtle', TEXT],
  ['fg', 'bg-elevated', TEXT],
  ['fg', 'bg-muted', TEXT],
  ['fg-muted', 'bg', TEXT],
  ['fg-muted', 'bg-subtle', TEXT],
  ['fg-muted', 'bg-elevated', TEXT],
  ['fg-muted', 'bg-muted', TEXT],
  ['fg-subtle', 'bg', TEXT],
  ['fg-subtle', 'bg-subtle', TEXT],
  ['fg-subtle', 'bg-elevated', TEXT],
  ['fg-subtle', 'bg-muted', TEXT],
  ['fg-subtle', 'accent-subtle', TEXT],
  ['accent-fg', 'accent', TEXT],
  ['accent', 'bg', TEXT],
  ['accent', 'bg-subtle', TEXT],
  ['accent', 'bg-elevated', TEXT],
  ['accent', 'accent-subtle', TEXT],
  ['accent', 'bg-muted', TEXT],
  ['up', 'bg', TEXT],
  ['up', 'bg-subtle', TEXT],
  ['up', 'bg-elevated', TEXT],
  ['up', 'up-bg', TEXT],
  ['down', 'bg', TEXT],
  ['down', 'bg-subtle', TEXT],
  ['down', 'bg-elevated', TEXT],
  ['down', 'down-bg', TEXT],
  ['info', 'bg-subtle', TEXT],
  ['warn', 'bg-subtle', TEXT],
  ['warn', 'warn-bg', TEXT],
  ['danger', 'bg', TEXT],
  ['danger', 'bg-subtle', TEXT],
  ['danger', 'bg-elevated', TEXT],
  ['danger', 'danger-bg', TEXT],
  ['success', 'bg-subtle', NON_TEXT],
  ['border-strong', 'bg', NON_TEXT],
  ['border-strong', 'bg-subtle', NON_TEXT],
  ['border-strong', 'bg-elevated', NON_TEXT],
  ['border-strong', 'bg-muted', NON_TEXT],
  ['focus-ring', 'bg', NON_TEXT],
  ['focus-ring', 'bg-subtle', NON_TEXT],
  ['focus-ring', 'bg-elevated', NON_TEXT],
];

const ratio = (theme: Record<string, string>, fg: ColorToken, bg: ColorToken): number => {
  const fgValue = theme[fg];
  const bgValue = theme[bg];
  if (!fgValue || !bgValue) throw new Error(`Eksik token: ${fg} / ${bg}`);
  return contrastRatio(parseHslTriplet(fgValue), parseHslTriplet(bgValue));
};

describe("tasarım token'ları", () => {
  it.each(Object.entries(themes))(
    "%s temasında her renk token'ı tanımlı ve geçerli HSL",
    (_, theme) => {
      for (const token of COLOR_TOKENS) {
        expect(theme[token], token).toBeDefined();
        expect(() => parseHslTriplet(theme[token] ?? ''), token).not.toThrow();
      }
    }
  );

  it('iki tema aynı token kümesini tanımlar (biri eksik kalmasın)', () => {
    const names = (theme: Record<string, string>): string[] =>
      Object.keys(theme)
        .filter(name => name !== 'duration-fast' && name !== 'duration-base')
        .sort();
    expect(names(themes.dark)).toEqual(names(themes.light));
  });

  describe.each(Object.entries(themes))('%s teması WCAG 2.2 AA', (_, theme) => {
    it.each(PAIRS.map(([fg, bg, min]) => [`${fg} / ${bg} ≥ ${min}`, fg, bg, min] as const))(
      '%s',
      (_label, fg, bg, min) => {
        expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(min);
      }
    );
  });
});
