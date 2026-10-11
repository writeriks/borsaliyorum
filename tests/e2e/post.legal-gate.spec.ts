import { expect, test } from './support/test';

import { editor, mockComposerApis, submitButton, tr, typeInEditor } from './helpers/composer';
import { loginViaUi, seedOnboardedUser, uniqueSuffix, withDb } from './support/auth';

// Yasal paket kapısı (`WRITER_GATES` → `LEGAL_ACCEPTANCE_REQUIRED`): eski sürümü kabul etmiş
// kullanıcı okuyabilir ama yazamaz. Gönderi denemesi sunucuda reddedilir; istemci
// (`useActionResult`) taslağı kaydedip kabul ekranına, kabulden sonra aynı sayfaya döndürür.

const postCountOf = (username: string): Promise<number> =>
  withDb(async client => {
    const { rows } = await client.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM "Post" p JOIN "User" u ON u."userId" = p."userId"
       WHERE u.username = $1`,
      [username]
    );
    return Number(rows[0]?.n ?? '0');
  });

test('[LGL-GATE] eski yasal sürüm → gönderi denemesi → yeni sürüm ekranı → kabul → gönderi başarılı', async ({
  page,
}) => {
  const account = await seedOnboardedUser({ legalBundleVersion: '2020-01-v1' });
  await mockComposerApis(page);
  await loginViaUi(page, account);
  await page.waitForURL('**/akis');

  const text = `Kabul öncesi taslak ${uniqueSuffix()}`;
  await typeInEditor(page, text);
  await submitButton(page).click();

  // Sunucu reddeder: açıklayıcı toast + kabul ekranı (next = bulunduğu sayfa), satır yok
  await page.waitForURL(/\/yasal\/yeni-surum\?next=%2Fakis$/);
  await expect(page.getByText(tr.errors.LEGAL_ACCEPTANCE_REQUIRED)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(tr.legalUpdate.title);
  expect(await postCountOf(account.username)).toBe(0);

  await page.getByRole('checkbox', { name: tr.legalUpdate.checkbox }).check();
  await page.getByTestId('legal-accept-submit').click();
  await page.waitForURL('**/akis');
  await expect(page.getByTestId('legal-update-notice')).toHaveCount(0);

  // Taslak korunmuş: aynı metin tekrar gönderilir ve bu kez yazılır
  await expect(editor(page)).toContainText(text);
  await submitButton(page).click();
  await expect(page.getByText(tr.composer.success.post)).toBeVisible();
  await expect(page.getByTestId('my-posts').getByTestId('post-card').first()).toContainText(text);
  expect(await postCountOf(account.username)).toBe(1);
});
