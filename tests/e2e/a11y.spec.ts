import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from './support/test';

import tr from '../../messages/tr.json' with { type: 'json' };

import { createFirebaseAccount, loginViaUi, seedOnboardedUser, withDb } from './support/auth';

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

  test('akış gönderi kartlarıyla, /paylas ve gönderi detayı (girişli)', async ({ page }) => {
    const viewer = await seedOnboardedUser();
    const author = await seedOnboardedUser();
    const postId = await withDb(async client => {
      await client.query(
        `INSERT INTO "UserFollowers" ("followerId", "followingId")
         SELECT v."userId", a."userId" FROM "User" v, "User" a
         WHERE v.username = $1 AND a.username = $2`,
        [viewer.username, author.username]
      );
      let first = 0;
      for (const content of [
        '$THYAO için bugün sakin bir seyir var. https://www.kap.org.tr/tr/ #bist100',
        'İkinci gönderi: düz metin, @' + viewer.username + ' etiketli.',
      ]) {
        const { rows } = await client.query<{ postId: number }>(
          `INSERT INTO "Post" ("userId", content, sentiment, "contentFormat")
           SELECT "userId", $2, 'neutral', 2 FROM "User" WHERE username = $1
           RETURNING "postId"`,
          [author.username, content]
        );
        first ||= rows[0]?.postId ?? 0;
      }
      return first;
    });
    await loginViaUi(page, viewer);
    await page.waitForURL('**/akis');
    await expect(page.getByRole('article').first()).toBeVisible();
    expect(await scan(page), '/akis').toEqual([]);
    await page.goto('/paylas');
    await expect(page.getByRole('textbox', { name: tr.composer.label.post })).toBeVisible();
    expect(await scan(page), '/paylas').toEqual([]);
    await page.goto(`/gonderi/${postId}`);
    await expect(page.getByRole('article').first()).toBeVisible();
    expect(await scan(page), '/gonderi/[id]').toEqual([]);
  });

  test('404 sayfası (girişsiz)', async ({ page }) => {
    const response = await page.goto('/bu-sayfa-yok');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('main')).toBeVisible();
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
