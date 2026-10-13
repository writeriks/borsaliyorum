import { expect, type Page, test } from './support/test';

import tr from '../../messages/tr.json' with { type: 'json' };

import { accountMenu, loginViaUi, seedOnboardedUser, signOutViaUi, withDb } from './support/auth';
import { E2E_BASE_URL } from './support/env';

const loggedIn = async (page: Page): Promise<Awaited<ReturnType<typeof seedOnboardedUser>>> => {
  const account = await seedOnboardedUser();
  await loginViaUi(page, account);
  await page.waitForURL('**/akis');
  await expect(accountMenu(page)).toBeVisible();
  return account;
};

/** Belge isteklerinin yönlendirme zincirini kaydeder (döngü tespiti). */
const trackRedirects = (page: Page): string[] => {
  const redirects: string[] = [];
  page.on('response', response => {
    if (
      response.request().resourceType() === 'document' &&
      response.status() >= 300 &&
      response.status() < 400
    ) {
      redirects.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });
  return redirects;
};

test.describe('çıkış ve geçersiz oturum', () => {
  test('çıkış: UI anında anonim; geri tuşu korumalı içeriği göstermez', async ({
    page,
    context,
  }) => {
    await loggedIn(page);
    await page.goto('/akis');
    await expect(page.getByRole('heading', { level: 1, name: tr.feed.title })).toBeVisible();

    await signOutViaUi(page);
    // Sunucu yanıtı beklenmeden giriş çağrısı görünür
    await expect(page.getByTestId('login-cta').filter({ visible: true }).first()).toBeVisible();
    await page.waitForURL(url => url.pathname === '/');
    expect((await context.cookies()).find(cookie => cookie.name === '__session')).toBeUndefined();

    await page.goBack();
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/akis$/);
    await expect(page.getByRole('heading', { name: tr.feed.title })).toHaveCount(0);
    await expect(page.getByTestId('viewer-avatar')).toHaveCount(0);
  });

  test('çıkış tüm cihazlarda geçerli: diğer cihazdaki çerez → girişe tek yönlendirme', async ({
    page,
    browser,
  }) => {
    const account = await loggedIn(page);

    // İkinci cihaz: aynı hesapla ayrı oturum
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await loginViaUi(otherPage, account);
    await otherPage.waitForURL('**/akis');

    await signOutViaUi(page);
    await page.waitForURL(url => url.pathname === '/');

    const redirects = trackRedirects(otherPage);
    await otherPage.goto('/akis');
    await expect(otherPage).toHaveURL(/\/giris\?next=%2Fakis$/);
    await expect(otherPage.getByRole('heading', { level: 1 })).toHaveText(tr.auth.login.title);
    expect(redirects).toHaveLength(1);
    await other.close();
  });

  test("DB'de iptal edilmiş (sessionsValidAfter) çerez → girişe tek yönlendirme, döngü yok", async ({
    page,
  }) => {
    const account = await loggedIn(page);
    await withDb(client =>
      client.query(
        `UPDATE "User" SET "sessionsValidAfter" = now() + interval '1 minute' WHERE email = $1`,
        [account.email]
      )
    );

    const redirects = trackRedirects(page);
    await page.goto('/akis');
    await expect(page).toHaveURL(/\/giris\?next=%2Fakis$/);
    expect(redirects).toEqual(['307 /akis']);
    // Giriş sayfası (geçersiz çerez hâlâ duruyor) anonim render edilir, geri yönlendirmez
    await expect(page.getByTestId('auth-submit')).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/giris/);
  });

  test('bozuk çerez → girişe tek yönlendirme; landing anonim', async ({ page, context }) => {
    await context.addCookies([
      {
        name: '__session',
        value: 'bozuk.cerez.degeri',
        url: E2E_BASE_URL,
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    const redirects = trackRedirects(page);
    await page.goto('/akis');
    await expect(page).toHaveURL(/\/giris\?next=%2Fakis$/);
    expect(redirects).toHaveLength(1);

    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('login-cta').filter({ visible: true }).first()).toBeVisible();
  });
});
