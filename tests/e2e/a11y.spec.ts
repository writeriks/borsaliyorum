import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import tr from '../../messages/tr.json' with { type: 'json' };

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const scan = async (page: Page): Promise<{ id: string; impact: string; targets: string[] }[]> => {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations
    .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
    .map(violation => ({
      id: violation.id,
      impact: violation.impact ?? '',
      targets: violation.nodes.map(node => node.target.join(' ')),
    }));
};

test.describe('erişilebilirlik (axe): serious/critical ihlal yok', () => {
  for (const path of ['/', '/en']) {
    for (const theme of ['dark', 'light'] as const) {
      test(`${path} · ${theme}`, async ({ page }) => {
        await page.addInitScript(value => {
          window.localStorage.setItem('theme', value);
        }, theme);
        await page.goto(path);
        await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
        await expect(page.getByRole('main')).toBeVisible();
        expect(await scan(page)).toEqual([]);
      });
    }
  }

  test('tema menüsü açıkken', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: tr.theme.toggle }).filter({ visible: true }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });
});
