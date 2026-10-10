import { describe, expect, it } from 'vitest';

import {
  collectLoadableEntries,
  evaluateBudgets,
  type LazyBudget,
  type MeasuredEntry,
} from '../../scripts/bundle-budget';

const BUDGET: LazyBudget = { name: 'composer', marker: 'ac-cashtag', maxGzipBytes: 100 };

const measured = (files: string[], gzipBytes: number, text: string): MeasuredEntry => ({
  id: files.join(),
  files,
  gzipBytes,
  text,
});

describe('collectLoadableEntries', () => {
  it('JS dosyalarını alır, CSS ve tekrarlanan girişleri atar', () => {
    const manifest = {
      '1': { id: 1, files: ['static/chunks/a.js', 'static/chunks/b.js', 'static/chunks/x.css'] },
      '2': { id: 2, files: ['static/chunks/only.css'] },
    };
    const entries = collectLoadableEntries([manifest, manifest, null, 'bozuk']);
    expect(entries).toEqual([{ id: '1', files: ['static/chunks/a.js', 'static/chunks/b.js'] }]);
  });
});

describe('evaluateBudgets', () => {
  it('bütçe içinde → ok', () => {
    const [result] = evaluateBudgets(
      [measured(['c.js'], 90, 'new PluginKey("ac-cashtag")')],
      [BUDGET]
    );
    expect(result).toMatchObject({ ok: true, gzipBytes: 90 });
  });

  it('bütçe aşımı → başarısız', () => {
    const [result] = evaluateBudgets([measured(['c.js'], 101, 'ac-cashtag')], [BUDGET]);
    expect(result?.ok).toBe(false);
  });

  it('işaretli chunk yoksa ölçülemedi → başarısız (kapı sessizce geçmez)', () => {
    const [result] = evaluateBudgets([measured(['d.js'], 10, 'başka')], [BUDGET]);
    expect(result).toMatchObject({ ok: false, gzipBytes: null });
  });

  it('birden çok eşleşmede en büyüğü ölçülür', () => {
    const [result] = evaluateBudgets(
      [measured(['a.js'], 50, 'ac-cashtag'), measured(['b.js'], 120, 'ac-cashtag')],
      [BUDGET]
    );
    expect(result).toMatchObject({ ok: false, gzipBytes: 120, files: ['b.js'] });
  });
});
