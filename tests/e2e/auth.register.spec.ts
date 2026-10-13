import { expect, test } from './support/test';

import tr from '../../messages/tr.json' with { type: 'json' };
import { PRIVACY_NOTICE_VERSION, TERMS_VERSION } from '../../src/lib/legal/versions';

import { accountMenu, uniqueSuffix, withDb } from './support/auth';

test.describe('kayıt → onboarding → akış', () => {
  test('e-posta ile kayıt, kurallı kullanıcı adı, 18+ / Kullanım Koşulları / aydınlatma kutuları', async ({
    page,
  }) => {
    const suffix = uniqueSuffix();
    const email = `kayit_${suffix}@example.test`;

    await page.goto('/kayit');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tr.auth.signup.title);
    // Aydınlatma notu butonların hemen altında (footer'a gömülü değil), ilk ekranda
    const privacyNote = page.getByTestId('auth-privacy-note');
    await expect(privacyNote).toBeInViewport();
    await expect(privacyNote.getByRole('link', { name: 'Aydınlatma Metni' })).toHaveAttribute(
      'href',
      '/yasal/kvkk'
    );

    await page.getByLabel(tr.auth.fields.email).fill(email);
    await page.getByLabel(tr.auth.fields.password).fill(`Sifre-${suffix}!`);
    const submit = page.getByTestId('auth-submit');
    await submit.click();
    // Butona basıldığı an devre dışı + "Hesap oluşturuluyor…" (navigasyon bitene kadar)
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText(tr.auth.signup.submitting);

    // Yeni hesap: onboarding (placeholder kullanıcı adı yok)
    await page.waitForURL('**/hos-geldin');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tr.auth.onboarding.title);
    expect(
      await withDb(
        async client =>
          (await client.query('SELECT 1 FROM "User" WHERE email = $1', [email])).rowCount
      )
    ).toBe(0);

    const username = page.getByLabel(tr.auth.onboarding.username.label);
    // MARKETING_CONSENT_ENABLED varsayılan kapalı (İYS entegrasyonu yok) → kutu hiç yok
    await expect(page.getByLabel(tr.auth.onboarding.marketing.label)).toHaveCount(0);
    const terms = page.getByLabel(/Kullanım Koşulları/);
    await expect(terms).not.toBeChecked();
    await expect(page.getByRole('checkbox')).toHaveCount(3);

    // Rezerve ad
    await username.fill('admin');
    await page.getByLabel(tr.auth.onboarding.displayName.label).fill('Kayıt Testi');
    await page.getByLabel(tr.auth.onboarding.age.label).check();
    await page.getByLabel(/Aydınlatma Metni/).check();

    // Kullanım Koşulları işaretlenmeden gönderilemez (istemci; sunucu da reddeder)
    await page.getByTestId('onboarding-submit').click();
    await expect(page.getByText(tr.auth.onboarding.terms.required)).toBeVisible();
    await expect(page).toHaveURL(/\/hos-geldin$/);
    await terms.check();

    await page.getByTestId('onboarding-submit').click();
    await expect(page.getByText(tr.auth.onboarding.username.errors.reserved)).toBeVisible();

    // Kurala uymayan ad
    await username.fill('Ayşe.K');
    await page.getByTestId('onboarding-submit').click();
    await expect(page.getByText(tr.auth.onboarding.username.errors.invalidChars)).toBeVisible();

    // Uygun ad: canlı müsaitlik kontrolü
    const chosen = `kayit_${suffix}`;
    await username.fill(chosen);
    await expect(page.getByText(tr.auth.onboarding.username.available)).toBeVisible();
    await page.getByTestId('onboarding-submit').click();

    await page.waitForURL('**/akis');
    await expect(accountMenu(page)).toBeVisible();
    // Doğrulanmamış e-posta: okuyabilir, yazamaz → bant
    await expect(page.getByTestId('email-verification-notice')).toBeVisible();

    const row = await withDb(async client => {
      const user = await client.query<{
        userId: number;
        username: string;
        isEmailVerified: boolean;
        noticeAcknowledgedAt: Date | null;
        ageConfirmedAt: Date | null;
        noticeVersion: string | null;
        termsVersion: string | null;
        termsAcceptedAt: Date | null;
      }>(
        'SELECT "userId", username, "isEmailVerified", "noticeAcknowledgedAt", "ageConfirmedAt", "noticeVersion", "termsVersion", "termsAcceptedAt" FROM "User" WHERE email = $1',
        [email]
      );
      const userId = user.rows[0]?.userId ?? -1;
      const consents = await client.query('SELECT 1 FROM "ConsentEvent" WHERE "userId" = $1', [
        userId,
      ]);
      const events = await client.query<{ action: string; has_ip: boolean }>(
        'SELECT action::text, "ipEncrypted" IS NOT NULL AS has_ip FROM "ContentEvent" WHERE "actorUserId" = $1',
        [userId]
      );
      return { user: user.rows[0], consents: consents.rowCount, events: events.rows };
    });
    expect(row.user).toMatchObject({
      username: chosen,
      isEmailVerified: false,
      noticeVersion: PRIVACY_NOTICE_VERSION,
      termsVersion: TERMS_VERSION,
    });
    expect(row.user?.termsAcceptedAt).not.toBeNull();
    expect(row.user?.noticeAcknowledgedAt).not.toBeNull();
    expect(row.user?.ageConfirmedAt).not.toBeNull();
    expect(row.consents).toBe(0);
    expect(row.events).toEqual([{ action: 'session.start', has_ip: true }]);
  });

  test('alınmış kullanıcı adı reddedilir', async ({ page }) => {
    const suffix = uniqueSuffix();
    const taken = `alinmis_${suffix}`;
    await withDb(client =>
      client.query(
        `INSERT INTO "User" ("firebaseUserId", username, "displayName", email, "isEmailVerified", "onboardedAt")
         VALUES ($1, $2, 'Var Olan', $3, true, now())`,
        [`seed-${suffix}`, taken, `seed_${suffix}@example.test`]
      )
    );

    await page.goto('/kayit');
    await page.getByLabel(tr.auth.fields.email).fill(`yeni_${suffix}@example.test`);
    await page.getByLabel(tr.auth.fields.password).fill(`Sifre-${suffix}!`);
    await page.getByTestId('auth-submit').click();
    await page.waitForURL('**/hos-geldin');

    await page.getByLabel(tr.auth.onboarding.username.label).fill(taken);
    await expect(page.getByText(tr.auth.onboarding.username.errors.taken)).toBeVisible();
  });
});
