import { expect, test } from './support/test';

import tr from '../../messages/tr.json' with { type: 'json' };

import { accountMenu, loginViaUi, seedOnboardedUser } from './support/auth';

test.describe('giriş', () => {
  test('yanlış şifre ve olmayan hesap aynı, alan belirtmeyen mesajı alır', async ({ page }) => {
    const account = await seedOnboardedUser();

    await loginViaUi(page, { email: account.email, password: 'yanlis-sifre' });
    const wrongPassword = page.getByTestId('auth-form-error');
    await expect(wrongPassword).toHaveText(tr.auth.errors.invalidCredentials);
    await expect(page.getByTestId('auth-submit')).toBeEnabled();

    await loginViaUi(page, { email: 'olmayan-hesap@example.test', password: 'herhangi-sifre' });
    await expect(page.getByTestId('auth-form-error')).toHaveText(tr.auth.errors.invalidCredentials);
    await expect(page.getByLabel(tr.auth.fields.email)).not.toHaveAttribute('aria-invalid');
  });

  test('buton basıldığı an devre dışı + spinner; next parametresine dönülür', async ({ page }) => {
    const account = await seedOnboardedUser();

    // Oturumsuz korumalı sayfa → tek yönlendirme ile girişe, next korunur
    await page.goto('/akis?sekme=son');
    await expect(page).toHaveURL(/\/giris\?next=%2Fakis%3Fsekme%3Dson$/);

    await page.getByLabel(tr.auth.fields.email).fill(account.email);
    await page.getByLabel(tr.auth.fields.password).fill(account.password);
    const submit = page.getByTestId('auth-submit');
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText(tr.auth.login.submitting);
    await expect(submit.getByTestId('button-spinner')).toBeVisible();

    await page.waitForURL('**/akis?sekme=son');
    await expect(accountMenu(page)).toBeVisible();
  });

  test('girişli kullanıcı /giris ve landing açınca sunucuda akışa yönlenir', async ({ page }) => {
    const account = await seedOnboardedUser();
    await loginViaUi(page, account);
    await page.waitForURL('**/akis');

    const login = await page.goto('/giris');
    expect(login?.url()).toMatch(/\/akis$/);
    const landing = await page.goto('/');
    expect(landing?.url()).toMatch(/\/akis$/);
  });
});
