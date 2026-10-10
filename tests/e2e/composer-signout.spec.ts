import { expect, type Page, test } from './support/test';

import { editor, editorText, typeInEditor } from './helpers/composer';
import { accountMenu, loginViaUi, seedOnboardedUser, signOutViaUi } from './support/auth';

// [DRF-04] Paylaşılan cihaz: çıkışta (AuthProvider → SIGNED_OUT_EVENT) ComposerGate bu cihazdaki
// tüm taslakları siler; aynı hesapla tekrar girişte taslak geri gelmez. Composer `/dev/composer`
// önizlemesinde gerçek oturumla (`auth=session`) açılır; kabuk ve taslak anahtarı gerçek userId.

const COMPOSER = '/dev/composer?auth=session';
const DRAFT_TEXT = 'Ortak bilgisayarda yarım kalan taslak';

const draftEntries = (page: Page): Promise<Array<[string, string]>> =>
  page.evaluate(() =>
    Object.keys(window.localStorage)
      .filter(key => key.startsWith('bz:draft:'))
      .map((key): [string, string] => [key, window.localStorage.getItem(key) ?? ''])
  );

test('[DRF-04] giriş → taslak → çıkış → tekrar giriş: taslak yok', async ({ page }) => {
  const account = await seedOnboardedUser();
  await loginViaUi(page, account);
  await page.waitForURL('**/akis');

  await page.goto(COMPOSER);
  await expect(accountMenu(page)).toBeVisible();
  await typeInEditor(page, DRAFT_TEXT);
  // Taslak gerçek kullanıcının anahtarında (sahte 42 değil)
  await expect
    .poll(() => draftEntries(page))
    .toEqual([[expect.stringMatching(/^bz:draft:\d+:post$/), expect.stringContaining(DRAFT_TEXT)]]);
  expect((await draftEntries(page))[0]?.[0]).not.toBe('bz:draft:42:post');

  await signOutViaUi(page);
  await page.waitForURL(url => url.pathname === '/');
  expect(await draftEntries(page)).toEqual([]);

  // Çıkış `sessionsValidAfter`'ı bir sonraki saniyenin başına yazar (auth/rules.ts); aynı saniyede
  // yapılan giriş bilinçli olarak REAUTH_REQUIRED alır. Gerçek kullanıcı gibi o saniyeyi geçir.
  const validAfter = Math.ceil(Date.now() / 1000) * 1000;
  await expect.poll(() => Date.now()).toBeGreaterThan(validAfter);

  await loginViaUi(page, account);
  await page.waitForURL('**/akis');
  await page.goto(COMPOSER);
  await expect(accountMenu(page)).toBeVisible();
  await expect(editor(page)).toBeVisible();
  expect(await editorText(page)).toBe('');
  await expect(page.getByText(DRAFT_TEXT)).toHaveCount(0);
  expect(await draftEntries(page)).toEqual([]);
});
