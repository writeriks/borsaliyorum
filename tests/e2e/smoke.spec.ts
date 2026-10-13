import { expect, test } from './support/test';

import en from '../../messages/en.json' with { type: 'json' };
import tr from '../../messages/tr.json' with { type: 'json' };

test.describe('i18n smoke', () => {
  test('/ Türkçe render eder', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tr.home.title);
    await expect(page.getByText(tr.home.lead)).toBeVisible();
    await expect(page).toHaveTitle(tr.metadata.title);
  });

  test('/en İngilizce render eder', async ({ page }) => {
    const response = await page.goto('/en');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText(en.home.lead)).toBeVisible();
  });

  test('dil bağlantısı diller arasında geçiş yapar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: tr.home.switchLocaleLabel }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByText(en.home.lead)).toBeVisible();

    await page.getByRole('link', { name: en.home.switchLocaleLabel }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(tr.home.lead)).toBeVisible();
  });

  test('varsayılan dil öneksiz: /tr → / yönlendirir', async ({ page }) => {
    await page.goto('/tr');
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test('İngilizce tarayıcı dili / adresini değiştirmez (URL tek kaynak)', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await context.close();
  });

  test('bilinmeyen yol yerelleştirilmiş 404 döner', async ({ page }) => {
    const response = await page.goto('/olmayan-sayfa');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tr.notFound.title);
  });
});
