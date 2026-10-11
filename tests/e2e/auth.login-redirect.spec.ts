import { expect, type Page, test } from './support/test';

import en from '../../messages/en.json' with { type: 'json' };
import tr from '../../messages/tr.json' with { type: 'json' };

import { accountMenu, seedOnboardedUser, uniqueSuffix } from './support/auth';

/**
 * Regresyon: oturumsuz kullanıcı korumalı sayfadan (`/akis` → `/giris?next=/akis`) giriş
 * yapınca istemci ~6 sn'de yüzlerce kez `/akis` ↔ `/giris` arasında geziniyordu. Neden: giriş
 * sayfasındaki linkler anonimken prefetch edilir; proxy'nin `/akis → /giris?next=/akis`
 * yönlendirmesi istemci router önbelleğinde kalır ve `router.replace + router.refresh()` onu
 * temizlemez. Kural: tam olarak bir kez `/akis`'e varış ve girişten sonra hiçbir karede
 * "Giriş yap" yok (auth-session UX kuralı 1 ve 3).
 */

/** Varışı bekledikten sonra döngü sürüyorsa yakalamak için bekleme (döngü ~70 gezinme/sn). */
const SETTLE_MS = 1_500;
const MAX_NAVIGATIONS = 3;

type Messages = typeof tr;

/**
 * Her belgede (tam sayfa geçişleri dahil) her karede "Giriş yap" CTA'sını arar. Giriş
 * sayfasında gönder butonu devre dışı kaldığı an (giriş başladı) silahlanır; diğer sayfalarda
 * ilk kareden itibaren. Bulgu, gezinmelerde kalıcı olan binding ile teste bildirilir.
 */
const watchLoginCta = async (page: Page, loginText: string): Promise<string[]> => {
  const seen: string[] = [];
  await page.exposeBinding('__reportLoginCta', (_source, what: string) => {
    seen.push(what);
  });
  await page.addInitScript((text: string) => {
    const report = (window as unknown as { __reportLoginCta: (what: string) => void })
      .__reportLoginCta;
    let armed = !/\/giris$/.test(window.location.pathname);
    const visible = (el: Element): boolean => el.getClientRects().length > 0;
    const tick = (): void => {
      if (!armed && document.querySelector('[data-testid="auth-submit"][disabled]')) armed = true;
      if (armed && document.body) {
        const hit = Array.from(document.querySelectorAll('a, button')).find(
          el =>
            visible(el) &&
            (el.getAttribute('data-testid') === 'login-cta' ||
              el.getAttribute('aria-label') === text ||
              el.textContent?.trim() === text)
        );
        if (hit) report(`${window.location.pathname}: ${hit.outerHTML.slice(0, 120)}`);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, loginText);
  return seen;
};

type NavigationLog = {
  /** Ana çerçevedeki tüm gezinmeler (belge + history API; Next ilk yüklemede replaceState yapar). */
  readonly navigations: string[];
};

const recordNavigations = (page: Page): NavigationLog => {
  const log: NavigationLog = { navigations: [] };
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) log.navigations.push(frame.url());
  });
  return log;
};

/**
 * Hedefe tam olarak bir varış (başka bir adresten hedefe geçiş sayısı) ve gezinme döngüsü yok.
 * Aynı adrese ardışık kayıtlar tek varıştır: Next ilk yüklemede `history.replaceState` yapar.
 */
const expectSingleArrival = (log: NavigationLog, pathname: string): void => {
  const isTarget = (url: string | undefined): boolean =>
    url !== undefined && new URL(url).pathname === pathname;
  const arrivals = log.navigations.filter(
    (url, index) => isTarget(url) && !isTarget(log.navigations[index - 1])
  );
  expect(arrivals, log.navigations.join('\n')).toHaveLength(1);
  expect(log.navigations.length, log.navigations.join('\n')).toBeLessThanOrEqual(MAX_NAVIGATIONS);
};

const LOCALES: ReadonlyArray<{ prefix: '' | '/en'; messages: Messages }> = [
  { prefix: '', messages: tr },
  { prefix: '/en', messages: en },
];

for (const { prefix, messages } of LOCALES) {
  const feed = `${prefix}/akis`;

  test.describe(`${prefix || '/tr'}: korumalı sayfadan giriş`, () => {
    test(`${feed} → giriş → tek varış, döngü yok, "Giriş yap" görünmez`, async ({ page }) => {
      const account = await seedOnboardedUser();
      const loginCtaSeen = await watchLoginCta(page, messages.common.login);

      await page.goto(feed);
      await expect(page).toHaveURL(
        new RegExp(`${prefix}/giris\\?next=${encodeURIComponent(feed)}$`)
      );
      // Anonimken görünen linklerin (akış dahil) prefetch'i bitsin: hatanın önkoşulu
      await page.waitForLoadState('networkidle');

      const log = recordNavigations(page);
      await page.getByLabel(messages.auth.fields.email).fill(account.email);
      await page.getByLabel(messages.auth.fields.password).fill(account.password);
      await page.getByTestId('auth-submit').click();

      await page.waitForURL(url => url.pathname === feed);
      await expect(accountMenu(page)).toBeVisible();
      await page.waitForTimeout(SETTLE_MS);

      expect(new URL(page.url()).pathname).toBe(feed);
      expectSingleArrival(log, feed);
      expect(loginCtaSeen).toEqual([]);
    });
  });
}

test('kayıt → onboarding → /akis: tek varış, döngü yok', async ({ page }) => {
  const suffix = uniqueSuffix();
  await page.goto('/akis');
  await expect(page).toHaveURL(/\/giris\?next=%2Fakis$/);
  await page.goto('/kayit?next=%2Fakis');
  await page.waitForLoadState('networkidle');

  await page.getByLabel(tr.auth.fields.email).fill(`dongu_${suffix}@example.test`);
  await page.getByLabel(tr.auth.fields.password).fill(`Sifre-${suffix}!`);
  await page.getByTestId('auth-submit').click();
  await page.waitForURL(url => url.pathname === '/hos-geldin');
  await page.getByLabel(tr.auth.onboarding.username.label).fill(`dongu_${suffix}`);
  await page.getByLabel(tr.auth.onboarding.displayName.label).fill('Döngü Testi');
  await page.getByLabel(tr.auth.onboarding.age.label).check();
  await page.getByLabel(/Aydınlatma Metni/).check();
  await expect(page.getByText(tr.auth.onboarding.username.available)).toBeVisible();
  await page.waitForLoadState('networkidle');

  const log = recordNavigations(page);
  await page.getByTestId('onboarding-submit').click();
  await page.waitForURL(url => url.pathname === '/akis');
  await expect(accountMenu(page)).toBeVisible();
  await page.waitForTimeout(SETTLE_MS);

  expect(new URL(page.url()).pathname).toBe('/akis');
  expectSingleArrival(log, '/akis');
});

test('gözlemci kendini doğrular: anonim sayfada "Giriş yap" kaydedilir', async ({ page }) => {
  // Gözlemci bozuk olsaydı (hiçbir şey kaydetmeseydi) yukarıdaki testler boşuna geçerdi
  const loginCtaSeen = await watchLoginCta(page, tr.common.login);
  await page.goto('/');
  await expect.poll(() => loginCtaSeen.length).toBeGreaterThan(0);
});
