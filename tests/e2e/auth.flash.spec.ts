import { expect, type Page, test } from './support/test';

import tr from '../../messages/tr.json' with { type: 'json' };

import { accountMenu, loginViaUi, seedOnboardedUser } from './support/auth';

/**
 * Eski "3-5 sn anonim, sonra birden giriş" hatasının regresyonu (docs/audit/2026-10-auth-audit.md).
 * Sayfa daha boyanmadan kurulan MutationObserver, aşağıdakilerin DOM'a HİÇBİR anda girmediğini
 * kaydeder; ilk HTML zaten avatarı içerir:
 * - "Giriş yap" bağlantısı (`login-cta`) ya da metni (`common.login`; test kimliği olmayan bir
 *   kopya da yakalansın)
 * - auth skeleton'ları: sol menü (`auth-slot-skeleton`), mobil üst bar
 *   (`top-bar-account-skeleton`) ve `aria-busy="true"` taşıyan her yer tutucu; yalnızca içerik
 *   yüklemesi olarak işaretlenenler hariç (`data-skeleton="chunk"`: composer'ın lazy chunk'ı,
 *   `data-skeleton="content"`: akış listesinin Suspense iskeleti). Composer'ın auth `unknown`
 *   iskeleti işaretsizdir: görünürse yakalanır.
 */
const installFlashObserver = async (page: Page): Promise<void> => {
  await page.addInitScript((loginText: string) => {
    const seen: string[] = [];
    (window as unknown as { __authFlash: string[] }).__authFlash = seen;
    const record = (label: string): void => {
      if (!seen.includes(label)) seen.push(label);
    };
    const check = (): void => {
      if (document.querySelector('[data-testid="login-cta"]')) record('login-cta');
      if (document.querySelector('[data-testid="auth-slot-skeleton"]')) record('auth-skeleton');
      if (document.querySelector('[data-testid="top-bar-account-skeleton"]')) {
        record('top-bar-skeleton');
      }
      // İçerik yüklemesi iskeletleri auth durumu değildir (composer chunk'ı, akış listesi);
      // test kimliği değil özel işaret: composer'ın auth-unknown iskeleti hâlâ yakalanır
      if (
        document.querySelector(
          '[aria-busy="true"]:not([data-skeleton="chunk"]):not([data-skeleton="content"])'
        )
      ) {
        record('aria-busy');
      }
      // Yalnızca görünen metin: <script> içindeki RSC yükünde i18n kataloğu bulunabilir
      if (document.body?.innerText.includes(loginText)) record('login-text');
    };
    new MutationObserver(check).observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'data-testid', 'data-skeleton'],
    });
    document.addEventListener('readystatechange', check);
  }, tr.common.login);
};

const SIXTY_ONE_MINUTES = 61 * 60 * 1000;

const flashLog = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __authFlash: string[] }).__authFlash);

const reloadWithoutFlash = async (page: Page): Promise<void> => {
  await page.reload({ waitUntil: 'commit' });
  // İlk boyama: avatar DOM'da ve görünür
  await page.waitForSelector('[data-testid="viewer-avatar"]', { state: 'attached' });
  await page.waitForLoadState('load');
  await expect(accountMenu(page)).toBeVisible();
  expect(await flashLog(page)).toEqual([]);
};

test('girişli kullanıcı sayfayı yenilediğinde hiçbir karede "Giriş yap" ya da skeleton görünmez', async ({
  page,
}) => {
  const account = await seedOnboardedUser();
  await loginViaUi(page, account);
  await page.waitForURL('**/akis');
  await expect(accountMenu(page)).toBeVisible();

  await installFlashObserver(page);
  for (let attempt = 0; attempt < 3; attempt += 1) await reloadWithoutFlash(page);

  // İlk sunucu HTML'i (JS çalışmadan) avatarı içerir, "Giriş yap" ve skeleton içermez
  const html = await (await page.request.get('/akis')).text();
  expect(html).toContain('data-testid="viewer-avatar"');
  expect(html).not.toContain('data-testid="login-cta"');
  expect(html).not.toContain('data-testid="auth-slot-skeleton"');
  expect(html).not.toContain('data-testid="top-bar-account-skeleton"');

  // İlk boyamanın ekran görüntüsü (rapor için): avatar görünür durumda
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(accountMenu(page)).toBeVisible();
  await test.info().attach('ilk-boyama', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('1 saatlik ID token süresi geçtikten sonra (61 dk) yenileme: oturum sürer, flash yok', async ({
  page,
}) => {
  // Tarayıcı saati sahte: eski hatada istemci 1 saatlik ID token'ı tazelemeye çalışırken anonim
  // görünüyordu. Oturum artık 14 günlük HttpOnly çerezde; istemci saatine bağlı değil.
  await page.clock.install();
  const account = await seedOnboardedUser();
  await loginViaUi(page, account);
  await page.waitForURL('**/akis');
  await expect(accountMenu(page)).toBeVisible();

  await installFlashObserver(page);
  await page.clock.fastForward(SIXTY_ONE_MINUTES);
  await reloadWithoutFlash(page);
  await page.clock.fastForward(SIXTY_ONE_MINUTES);
  await reloadWithoutFlash(page);
});

test('gözlemci kendini doğrular: anonim sayfada "Giriş yap" kaydedilir', async ({ page }) => {
  // Gözlemci bozuk olsaydı (hiçbir şey kaydetmeseydi) yukarıdaki testler boşuna geçerdi
  await installFlashObserver(page);
  await page.goto('/');
  await page.waitForLoadState('load');
  expect(await flashLog(page)).toEqual(expect.arrayContaining(['login-cta', 'login-text']));
});
