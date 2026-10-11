import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * `a11y.spec.ts` ile aynı tarama: sonlu animasyonlar bittikten sonra (yarı saydam açılış
 * animasyonu yanlış kontrast ihlali verir) WCAG 2.2 AA, yalnızca serious/critical.
 */
export const scanSerious = async (
  page: Page
): Promise<{ id: string; impact: string; targets: string[] }[]> => {
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.all(finite.map(animation => animation.finished));
  });
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations
    .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
    .map(violation => ({
      id: violation.id,
      impact: violation.impact ?? '',
      targets: violation.nodes.map(node => node.target.join(' ')),
    }));
};
