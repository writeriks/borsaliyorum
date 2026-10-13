import { describe, expect, it, vi } from 'vitest';

import type { SkippedEntity } from './segments';
import { createSkipReporter } from './skip-report';

const UNSAFE: SkippedEntity[] = [{ index: 0, type: 'url', reason: 'unsafe-href' }];
const OVERLAP: SkippedEntity[] = [{ index: 1, type: 'cashtag', reason: 'overlap' }];

describe('createSkipReporter', () => {
  it('atlanan entity yoksa yazmaz', () => {
    const warn = vi.fn();
    createSkipReporter({ warn })('metin', []);
    expect(warn).not.toHaveBeenCalled();
  });

  it('aynı içerik tekrar render edilince yalnızca bir kez yazar', () => {
    const warn = vi.fn();
    const report = createSkipReporter({ warn });
    report('javascript:alert(1)', UNSAFE);
    report('javascript:alert(1)', UNSAFE);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('entity atlandı; düz metin render ediliyor', {
      skipped: UNSAFE,
    });
  });

  it('farklı metin ya da farklı atlama nedeni ayrıca yazılır', () => {
    const warn = vi.fn();
    const report = createSkipReporter({ warn });
    report('a', UNSAFE);
    report('b', UNSAFE);
    report('a', OVERLAP);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('kapasite dolunca küme sıfırlanır (bellek sınırlı)', () => {
    const warn = vi.fn();
    const report = createSkipReporter({ warn }, 2);
    report('a', UNSAFE);
    report('b', UNSAFE);
    report('c', UNSAFE);
    report('a', UNSAFE);
    expect(warn).toHaveBeenCalledTimes(4);
  });
});
