import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from './support/test';

import tr from '../../messages/tr.json' with { type: 'json' };

import { createFirebaseAccount, loginViaUi, seedOnboardedUser } from './support/auth';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Açılış animasyonları (Radix menü fade/zoom) bitmeden ölçülen kontrast, yarı saydam metin
 * yüzünden yanlış "serious" ihlal verir (aralıklı başarısızlık). Önce animasyonlar bitsin.
 */
const settleAnimations = (page: Page): Promise<void> =>
  page.evaluate(async () => {
    // Sonsuz animasyonlar (skeleton nabzı, spinner) hiç bitmez; yalnızca sonlu olanlar beklenir
    const finite = document
      .getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.all(finite.map(animation => animation.finished));
  });

const scan = async (page: Page): Promise<{ id: string; impact: string; targets: string[] }[]> => {
  await settleAnimations(page);
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
  for (const path of [
    '/',
    '/en',
    '/giris',
    '/kayit',
    '/en/giris',
    '/yasal/kvkk',
    '/yasal/cerez-politikasi',
    '/en/yasal/kullanim-kosullari',
  ]) {
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

  test('akış (girişli, doğrulanmamış e-posta bandıyla) ve hesap menüsü', async ({ page }) => {
    const account = await seedOnboardedUser();
    await loginViaUi(page, account);
    await page.waitForURL('**/akis');
    expect(await scan(page)).toEqual([]);
    await page.getByTestId('account-menu-trigger').filter({ visible: true }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });

  test('onboarding formu (hatalarla birlikte)', async ({ page }) => {
    const account = await createFirebaseAccount({ emailVerified: false });
    await loginViaUi(page, account);
    await page.waitForURL('**/hos-geldin');
    expect(await scan(page)).toEqual([]);
    await page.getByTestId('onboarding-submit').click();
    await expect(page.getByText(tr.auth.onboarding.age.required)).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });

  test('giriş hatası gösterilirken', async ({ page }) => {
    await loginViaUi(page, { email: 'yok@example.test', password: 'yanlis-sifre' });
    await expect(page.getByTestId('auth-form-error')).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });
});
