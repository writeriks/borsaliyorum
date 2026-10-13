import { expect, test } from './support/test';

import legalTr from '../../messages/legal/tr.json' with { type: 'json' };
import tr from '../../messages/tr.json' with { type: 'json' };
import {
  COMMUNITY_RULES_VERSION,
  INVESTMENT_DISCLAIMER_VERSION,
  LEGAL_BUNDLE_VERSION,
  TERMS_VERSION,
} from '../../src/lib/legal/versions';

import { loginViaUi, seedOnboardedUser, withDb } from './support/auth';

const banner = tr.legalUpdate.banner;

test.describe('yasal metinlerin yeni sürümü (yeniden kabul)', () => {
  test('kabul edilmemiş paket: okuma serbest, bant görünür; kabul edince bant kalkar ve kayıt yazılır', async ({
    page,
  }) => {
    const account = await seedOnboardedUser({ legalBundleVersion: null });
    await loginViaUi(page, account, '/giris?next=%2Fakis%3Fsekme%3Dson');
    await page.waitForURL('**/akis?sekme=son');

    // Okuma serbest: akış ve yasal sayfalar açılır, her sayfada bant
    const notice = page.getByTestId('legal-update-notice');
    await expect(notice.getByRole('heading', { name: banner.title })).toBeVisible();
    await page.goto('/yasal/kullanim-kosullari');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(legalTr.documents.terms.title);
    await expect(notice).toBeVisible();

    await page.goto('/akis?sekme=son');
    await notice.getByRole('link', { name: banner.cta }).click();
    await page.waitForURL(/\/yasal\/yeni-surum\?next=%2Fakis%3Fsekme%3Dson$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tr.legalUpdate.title);
    // Kabul ekranının kendisinde bant yok
    await expect(notice).toHaveCount(0);

    // Kutu işaretsiz → gönderilmez
    await page.getByTestId('legal-accept-submit').click();
    await expect(page.getByText(tr.legalUpdate.checkboxRequired)).toBeVisible();

    await page.getByRole('checkbox', { name: tr.legalUpdate.checkbox }).check();
    await page.getByTestId('legal-accept-submit').click();
    await page.waitForURL('**/akis?sekme=son');
    await expect(page.getByTestId('feed-column')).toBeVisible();
    await expect(notice).toHaveCount(0);

    const { rows } = await withDb(client =>
      client.query(
        `SELECT "legalBundleVersion", "termsVersion", "communityRulesVersion",
                "disclaimerVersion", "termsAcceptedAt"
         FROM "User" WHERE "firebaseUserId" = $1`,
        [account.uid]
      )
    );
    expect(rows[0]).toMatchObject({
      legalBundleVersion: LEGAL_BUNDLE_VERSION,
      termsVersion: TERMS_VERSION,
      communityRulesVersion: COMMUNITY_RULES_VERSION,
      disclaimerVersion: INVESTMENT_DISCLAIMER_VERSION,
    });
    expect(rows[0]?.termsAcceptedAt).toBeInstanceOf(Date);

    // Kabul edilmişken ekran açılırsa akışa döner
    await page.goto('/yasal/yeni-surum');
    await page.waitForURL('**/akis');
  });

  test('güncel paketi kabul etmiş kullanıcı bant görmez', async ({ page }) => {
    const account = await seedOnboardedUser();
    await loginViaUi(page, account);
    await page.waitForURL('**/akis');
    await expect(page.getByTestId('feed-column')).toBeVisible();
    await expect(page.getByTestId('legal-update-notice')).toHaveCount(0);
  });

  test('oturumsuz kabul ekranı girişe yönlendirir (next korunur)', async ({ page }) => {
    await page.goto('/yasal/yeni-surum');
    await expect(page).toHaveURL(/\/giris\?next=%2Fyasal%2Fyeni-surum$/);
  });
});
