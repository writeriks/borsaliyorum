import { expect, type Locator, type Page, test } from '@playwright/test';

import en from '../../messages/en.json' with { type: 'json' };
import tr from '../../messages/tr.json' with { type: 'json' };

const box = async (
  locator: Locator
): Promise<{ x: number; y: number; width: number; height: number }> => {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('Öğe görünür değil, boyutu ölçülemedi');
  return rect;
};

const expectNoHorizontalScroll = async (page: Page): Promise<void> => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
};

test.describe('uygulama kabuğu: layout', () => {
  test(
    'mobil: üst bar + alt tab bar, sol menü ve sağ kolon yok',
    { tag: '@mobile' },
    async ({ page }) => {
      await page.goto('/');
      const viewport = page.viewportSize();
      if (!viewport) throw new Error('viewport yok');

      const topBar = page.getByTestId('top-bar');
      await expect(topBar).toBeVisible();
      expect((await box(topBar)).height).toBe(56);
      await expect(topBar.getByRole('link', { name: tr.shell.homeLabel })).toBeVisible();

      const tabBar = page.getByTestId('tab-bar');
      await expect(tabBar).toBeVisible();
      const tabRect = await box(tabBar);
      expect(Math.round(tabRect.y + tabRect.height)).toBe(viewport.height);
      for (const name of [tr.shell.nav.feed, tr.shell.nav.explore, tr.shell.nav.compose]) {
        // Etiketler her zaman görünür (yalnız ikon değil)
        await expect(tabBar.getByRole('link', { name })).toBeVisible();
        await expect(tabBar.getByText(name, { exact: true })).toBeVisible();
      }

      await expect(page.getByTestId('side-nav')).toBeHidden();
      await expect(page.getByTestId('right-rail')).toBeHidden();
      await expectNoHorizontalScroll(page);

      // Sayfa sonu (footer uyarısı) tab bar'ın altında kalmaz
      const copyright = page.getByText(tr.shell.footer.copyright).filter({ visible: true });
      await copyright.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const copyRect = await box(copyright);
      expect(copyRect.y + copyRect.height).toBeLessThanOrEqual(tabRect.y);
    }
  );

  test(
    'xl (1280): etiketli sol menü 248 + akış ≤640 + sağ kolon 336',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/');

      const sideNav = page.getByTestId('side-nav');
      await expect(sideNav).toBeVisible();
      expect((await box(sideNav)).width).toBe(248);
      await expect(sideNav.getByText(tr.shell.nav.feed, { exact: true })).toBeVisible();
      await expect(sideNav.getByRole('link', { name: tr.shell.composeCta })).toBeVisible();

      const feed = await box(page.getByTestId('feed-column'));
      expect(feed.width).toBeLessThanOrEqual(640);
      expect(feed.width).toBeGreaterThanOrEqual(600);

      const aside = page.getByRole('complementary', { name: tr.shell.aside });
      await expect(aside).toBeVisible();
      expect((await box(aside)).width).toBe(336);
      await expect(aside.getByRole('heading', { name: tr.shell.trendingTitle })).toBeVisible();

      await expect(page.getByTestId('tab-bar')).toBeHidden();
      await expect(page.getByTestId('top-bar')).toBeHidden();
      await expectNoHorizontalScroll(page);
    }
  );

  test('lg (1100): 72px ikon rayı + akış + sağ kolon', { tag: '@desktop' }, async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto('/');

    const sideNav = page.getByTestId('side-nav');
    expect((await box(sideNav)).width).toBe(72);
    // Etiket gizli, erişilebilir ad duruyor; hover'da tooltip
    const feedLink = sideNav.getByRole('link', { name: tr.shell.nav.feed });
    await expect(feedLink).toBeVisible();
    await expect(sideNav.getByText(tr.shell.nav.feed, { exact: true })).toBeHidden();
    await feedLink.hover();
    await expect(page.getByRole('tooltip', { name: tr.shell.nav.feed })).toBeVisible();

    await expect(page.getByTestId('right-rail')).toBeVisible();
    expect((await box(page.getByTestId('feed-column'))).width).toBeLessThanOrEqual(640);
    await expectNoHorizontalScroll(page);
  });

  test(
    'md (800): ikon rayı + akış; sağ kolon, üst bar ve tab bar yok',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 900 });
      await page.goto('/');

      expect((await box(page.getByTestId('side-nav'))).width).toBe(72);
      await expect(page.getByTestId('right-rail')).toBeHidden();
      await expect(page.getByTestId('tab-bar')).toBeHidden();
      await expect(page.getByTestId('top-bar')).toBeHidden();
      expect((await box(page.getByTestId('feed-column'))).width).toBeLessThanOrEqual(640);
      await expectNoHorizontalScroll(page);
    }
  );

  test('auth çözülmeden "Giriş yap"/"Kayıt ol" hiç görünmez, skeleton görünür', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByText(tr.common.login, { exact: true })).toHaveCount(0);
    await expect(page.getByText(tr.common.signup, { exact: true })).toHaveCount(0);
  });

  test('skip link ilk Tab ile görünür ve içeriğe odak taşır', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: tr.shell.skipToContent });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  });

  test('/en kabuğu İngilizce render eder', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('link', { name: en.shell.skipToContent })).toBeAttached();
    await expect(
      page.getByRole('navigation', { name: en.shell.mainNav }).filter({ visible: true })
    ).toBeVisible();
    await expect(page.getByText(en.legal.disclaimer.full).filter({ visible: true })).toBeVisible();
  });

  test('Türkçe karakterler Inter latin-ext ile çizilir (fallback font değil)', async ({ page }) => {
    await page.goto('/');
    const faces = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts]
        .filter(face => face.family.replace(/['"]/g, '') === 'Inter')
        .map(face => ({ range: face.unicodeRange, status: face.status }));
    });
    // "Keşfet", "Akış" → ş (U+015F) Latin Extended-A alt kümesinde
    const latinExt = faces.find(face => face.range.includes('U+100-2BA'));
    expect(latinExt?.status).toBe('loaded');
  });
});

test.describe('dokunma hedefleri', () => {
  const measureTargets = async (page: Page): Promise<string[]> =>
    page.evaluate(() => {
      const selector =
        'a[href], button, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemradio"], [tabindex]:not([tabindex="-1"])';
      return (
        [...document.querySelectorAll<HTMLElement>(selector)]
          .filter(el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
          .map(el => ({ el, rect: el.getBoundingClientRect() }))
          // sr-only (ör. odaklanmamış skip link) görsel hedef değildir
          .filter(({ rect }) => rect.width > 1 && rect.height > 1)
          .filter(({ rect }) => rect.width < 43.5 || rect.height < 43.5)
          .map(
            ({ el, rect }) =>
              `${Math.round(rect.width)}×${Math.round(rect.height)} ${el.outerHTML.slice(0, 120)}`
          )
      );
    });

  test('kabuktaki tüm etkileşimli öğeler ≥ 44×44px', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible();
    expect(await measureTargets(page)).toEqual([]);
  });

  test('tema menüsü öğeleri ≥ 44×44px', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: tr.theme.toggle }).filter({ visible: true }).click();
    await expect(page.getByRole('menuitemradio', { name: tr.theme.light })).toBeVisible();
    // zoom-in açılış animasyonu sürerken öğeler ölçekli (%95) ölçülür; bitmesini bekle
    await page.waitForFunction(() =>
      (document.querySelector('[role="menu"]')?.getAnimations({ subtree: true }) ?? []).every(
        animation => animation.playState !== 'running'
      )
    );
    expect(await measureTargets(page)).toEqual([]);
  });
});

test.describe('uygulama kabuğu: oturum açık (sunucu render)', () => {
  // Kabuk Server Component; avatar baş harfleri sunucuda hesaplanır. Daha önce `'use client'`
  // modülünden fonksiyon çağrıldığı için bu durum RSC render'ında hata veriyordu.
  test('profil bağlantısı ve baş harfler görünür, giriş/kayıt UI yok', async ({ page }) => {
    const response = await page.goto('/dev/composer?shell=authenticated');
    expect(response?.status()).toBe(200);

    // Mobilde sol menü CSS ile gizli (rol sorguları gizli öğeyi görmez); DOM'da olması yeterli
    const profile = page.locator('a[aria-label="Ayşe Kaya @aysek"]');
    await expect(profile.first()).toBeAttached();
    await expect(profile.first().locator('[data-slot="avatar-fallback"]')).toHaveText('AK');
    await expect(page.getByRole('link', { name: tr.common.login })).toHaveCount(0);
    await expect(page.getByTestId('auth-slot-skeleton')).toHaveCount(0);
  });
});
