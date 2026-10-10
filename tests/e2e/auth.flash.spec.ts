import { expect, test } from '@playwright/test';

import { accountMenu, loginViaUi, seedOnboardedUser } from './support/auth';

/**
 * Eski "3-5 sn anonim, sonra birden giriş" hatasının regresyonu (docs/audit/2026-10-auth-audit.md).
 * Sayfa daha boyanmadan kurulan MutationObserver, "Giriş yap" (login-cta) ya da auth skeleton'ının
 * DOM'a HİÇBİR anda girmediğini kaydeder; ilk HTML zaten avatarı içerir.
 */
test('girişli kullanıcı sayfayı yenilediğinde hiçbir karede "Giriş yap" görünmez', async ({
  page,
}) => {
  const account = await seedOnboardedUser();
  await loginViaUi(page, account);
  await page.waitForURL('**/akis');
  await expect(accountMenu(page)).toBeVisible();

  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __authFlash: string[] }).__authFlash = seen;
    const check = (): void => {
      if (document.querySelector('[data-testid="login-cta"]')) seen.push('login-cta');
      if (document.querySelector('[data-testid="auth-slot-skeleton"]')) seen.push('skeleton');
    };
    new MutationObserver(check).observe(document, { childList: true, subtree: true });
    document.addEventListener('readystatechange', check);
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.reload({ waitUntil: 'commit' });
    // İlk boyama: avatar DOM'da ve görünür
    await page.waitForSelector('[data-testid="viewer-avatar"]', { state: 'attached' });
    await page.waitForLoadState('load');
    await expect(accountMenu(page)).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { __authFlash: string[] }).__authFlash)
    ).toEqual([]);
  }

  // İlk sunucu HTML'i (JS çalışmadan) avatarı içerir, "Giriş yap" içermez
  const html = await (await page.request.get('/akis')).text();
  expect(html).toContain('data-testid="viewer-avatar"');
  expect(html).not.toContain('data-testid="login-cta"');
  expect(html).not.toContain('data-testid="auth-slot-skeleton"');

  // İlk boyamanın ekran görüntüsü (rapor için): avatar görünür durumda
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(accountMenu(page)).toBeVisible();
  await test.info().attach('ilk-boyama', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
