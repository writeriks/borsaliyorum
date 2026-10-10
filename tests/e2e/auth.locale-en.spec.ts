import { expect, test } from './support/test';

import en from '../../messages/en.json' with { type: 'json' };

import { accountMenu, loginViaUi, seedOnboardedUser, uniqueSuffix } from './support/auth';

/**
 * /en akışında `next` çift önek regresyonu: `next=/en/akis` ham yoldur; sunucu yönlendirmesi
 * next-intl'in `redirect`'iyle yapılınca `/en/en/akis` (404) oluyordu.
 */
test.describe('/en: next yönlendirmesi tek önekli', () => {
  test('kayıt → onboarding → /en/akis (çift önek yok)', async ({ page }) => {
    const suffix = uniqueSuffix();
    await page.goto('/en/akis');
    await expect(page).toHaveURL(/\/en\/giris\?next=%2Fen%2Fakis$/);

    await page.goto('/en/kayit?next=%2Fen%2Fakis');
    await page.getByLabel(en.auth.fields.email).fill(`en_${suffix}@example.test`);
    await page.getByLabel(en.auth.fields.password).fill(`Sifre-${suffix}!`);
    await page.getByTestId('auth-submit').click();

    await page.waitForURL(url => url.pathname === '/en/hos-geldin');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.auth.onboarding.title);
    await page.getByLabel(en.auth.onboarding.username.label).fill(`en_${suffix}`);
    await page.getByLabel(en.auth.onboarding.displayName.label).fill('English Test');
    await page.getByLabel(en.auth.onboarding.age.label).check();
    await page.getByLabel(/Privacy Notice/).check();
    await expect(page.getByText(en.auth.onboarding.username.available)).toBeVisible();
    await page.getByTestId('onboarding-submit').click();

    await page.waitForURL(url => url.pathname === '/en/akis');
    expect(new URL(page.url()).pathname).not.toContain('/en/en/');
    await expect(
      page.getByRole('heading', { level: 1, name: en.feedPlaceholder.title })
    ).toBeVisible();
    await expect(accountMenu(page)).toBeVisible();
  });

  test('girişliyken /en/giris?next=/en/akis → sunucuda /en/akis', async ({ page }) => {
    const account = await seedOnboardedUser();
    await loginViaUi(page, account);
    await page.waitForURL('**/akis');

    const response = await page.goto('/en/giris?next=%2Fen%2Fakis%3Fsekme%3Dson');
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/en/akis');
    expect(new URL(page.url()).search).toBe('?sekme=son');
    await expect(
      page.getByRole('heading', { level: 1, name: en.feedPlaceholder.title })
    ).toBeVisible();
  });
});
