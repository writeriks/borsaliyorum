import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from '@/lib/errors';

import en from '../../messages/en.json';
import tr from '../../messages/tr.json';

import { routing } from './routing';

type Tree = { readonly [key: string]: string | Tree };

const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});

const catalogs = { tr: flatten(tr), en: flatten(en) };

describe('mesaj katalogları', () => {
  it('her desteklenen dilin katalogu var', () => {
    expect(Object.keys(catalogs).sort()).toEqual([...routing.locales].sort());
  });

  it('tr ve en aynı anahtarlara sahip', () => {
    expect(Object.keys(catalogs.en).sort()).toEqual(Object.keys(catalogs.tr).sort());
  });

  it('boş çeviri yok', () => {
    for (const [locale, messages] of Object.entries(catalogs)) {
      const empty = Object.entries(messages).filter(([, value]) => value.trim() === '');
      expect(empty, locale).toEqual([]);
    }
  });

  it('her ErrorCode için iki dilde de kullanıcı mesajı var', () => {
    for (const code of ERROR_CODES) {
      expect(catalogs.tr[`errors.${code}`], `tr errors.${code}`).toBeTruthy();
      expect(catalogs.en[`errors.${code}`], `en errors.${code}`).toBeTruthy();
    }
  });
});
