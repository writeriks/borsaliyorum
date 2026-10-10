import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';

import tr from '../../messages/tr.json' with { type: 'json' };

// Geçici önizleme (S6): yalnızca development/test ve ENABLE_DEV_PAGES=1 ile açılan E2E build'i
const PREVIEW = '/dev/post-card';
const CASHTAG_NAME = '$THYAO, Türk Hava Yolları A.O.';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const fixture = (page: Page, id: number): Locator => page.getByTestId(`fixture-${id}`);
const hoverCard = (page: Page): Locator => page.getByTestId('stock-hover-card');

// HoverCard `openDelay` (cashtag-link.tsx)
const OPEN_DELAY_MS = 400;
// Zamanlama toleransı, tarayıcı içinde `performance.now()` ile ölçülür (Playwright ↔ tarayıcı
// gidiş-dönüşü dahil değil): alt sınırda bir kare (16 ms) erken tetiklenme payı, üst sınırda CI
// yükünde zamanlayıcı gecikmesi + render için 600 ms.
const OPEN_EARLY_TOLERANCE_MS = 16;
const OPEN_LATE_TOLERANCE_MS = 600;

/**
 * Sayfayı açar ve hidrasyonu bekler: hidrasyondan önce yapılan hover'ın olayı kaybolur ve test
 * rastgele kırılır. `data-hydrated` cashtag linkinde, hidrasyondan sonra konur.
 */
const gotoHydrated = async (page: Page, url: string): Promise<Locator> => {
  await page.goto(url);
  const cashtag = fixture(page, 1).getByRole('link', { name: CASHTAG_NAME });
  await expect(cashtag).toHaveAttribute('data-hydrated', 'true');
  return cashtag;
};

const seriousViolations = async (page: Page): Promise<{ id: string; targets: string[] }[]> => {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations
    .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
    .map(violation => ({
      id: violation.id,
      targets: violation.nodes.map(node => node.target.join(' ')),
    }));
};

/** `hsl(var(--token))`'ın tarayıcıda hesaplanan rengi (tema sınıfına göre). */
const tokenColor = (page: Page, token: string): Promise<string> =>
  page.evaluate(name => {
    const probe = document.createElement('span');
    probe.style.backgroundColor = `hsl(var(${name}))`;
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  }, token);

test.beforeEach(async ({ page }) => {
  // Eski görsel fixture'ı üçüncü taraf host'a gitmesin
  await page.route('https://firebasestorage.googleapis.com/**', route =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"><rect width="16" height="9" fill="#888"/></svg>',
    })
  );
});

test.describe('RichText: entity görünümü ve link nitelikleri', () => {
  test('cashtag chip, hashtag, mention ([ENT-R01..R03])', async ({ page }) => {
    await page.goto(PREVIEW);
    const card = fixture(page, 1);

    const cashtag = card.getByRole('link', { name: CASHTAG_NAME });
    await expect(cashtag).toHaveAttribute('href', '/hisse/THYAO');
    const cashtagStyle = await cashtag.evaluate(element => {
      const style = getComputedStyle(element);
      return { weight: Number(style.fontWeight), background: style.backgroundColor };
    });
    expect(cashtagStyle.weight).toBeGreaterThanOrEqual(600);
    expect(cashtagStyle.background).toBe(await tokenColor(page, '--accent-subtle'));

    const hashtag = card.getByRole('link', { name: '#bist100' });
    await expect(hashtag).toHaveAttribute('href', '/etiket/bist100');
    await expect(hashtag).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    expect(
      Number(await hashtag.evaluate(e => getComputedStyle(e).fontWeight))
    ).toBeGreaterThanOrEqual(600);

    await expect(card.getByRole('link', { name: '@mehmet_y, Mehmet Yılmaz' })).toHaveAttribute(
      'href',
      '/u/mehmet_y'
    );
  });

  test('dış URL: kısaltılmış, ↗, yeni sekme, ugc rel, alt çizgi ([ENT-R04], [URL-01/02])', async ({
    page,
  }) => {
    await page.goto(PREVIEW);
    const link = fixture(page, 1).getByRole('link', {
      name: 'borsaistanbul.com/tr/sayfa/2367… (yeni sekmede açılır)',
    });
    await expect(link).toHaveAttribute(
      'href',
      'https://www.borsaistanbul.com/tr/sayfa/2367/endeks-bilgileri?x=1'
    );
    await expect(link).toHaveAttribute('target', '_blank');
    const rel = ((await link.getAttribute('rel')) ?? '').split(/\s+/);
    expect(rel).toEqual(expect.arrayContaining(['noopener', 'noreferrer', 'nofollow', 'ugc']));
    await expect(link).toHaveCSS('text-decoration-line', 'underline');
    await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(
      fixture(page, 1).getByRole('link', { name: /^kap\.org\.tr\/tr\/Bildirim\/1234567/ })
    ).toHaveText('kap.org.tr/tr/Bildirim/1234567 (yeni sekmede açılır)');
  });

  test('düşmanca içerik: script metin, javascript:/data: link değil, homograf punycode ([ENT-R06])', async ({
    page,
  }) => {
    const dialogs: string[] = [];
    page.on('dialog', dialog => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    await page.goto(PREVIEW);
    const card = fixture(page, 4);
    await expect(card).toContainText('<script>alert(1)</script>');
    await expect(card).toContainText('javascript:alert(3)');
    await expect(page.locator('a[href^="javascript:" i], a[href^="data:" i]')).toHaveCount(0);
    await expect(card.locator('script, img')).toHaveCount(0);

    const homograph = card.getByRole('link', { name: /^xn--pple-43d\.com\/giris/ });
    await expect(homograph).toHaveAttribute('href', 'https://xn--pple-43d.com/giris');
    await expect(homograph).not.toContainText('аpple');
    // Silinmiş kullanıcıya mention düz metin ([ENT-R07])
    await expect(card.getByRole('link', { name: /silinen_kullanici/ })).toHaveCount(0);
    expect(dialogs).toEqual([]);
  });

  test('klavye: entity’ler Tab ile odaklanır, odak halkası ≥ 2px ([ENT-R08])', async ({ page }) => {
    await page.goto(PREVIEW);
    let entity: string | null = null;
    for (let step = 0; step < 15 && entity !== 'cashtag'; step += 1) {
      await page.keyboard.press('Tab');
      entity = await page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.dataset.entity ?? null
      );
    }
    expect(entity).toBe('cashtag');
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as Element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
  });
});

test.describe('cashtag hover kartı', () => {
  test(
    'masaüstü: 400ms gecikmeyle açılır; KAP/TradingView, uyarı, fiyat yok ([HC-01/03/04/06])',
    { tag: '@desktop' },
    async ({ page }) => {
      const cashtag = await gotoHydrated(page, PREVIEW);
      // pointerenter → kartın DOM'a girişi arası süre, sayfa içinde ölçülür
      const openedAfter = page.evaluate(
        () =>
          new Promise<number>(resolve => {
            const trigger = document.querySelector(
              '[data-testid="fixture-1"] [data-entity="cashtag"]'
            );
            let enteredAt = Number.NaN;
            trigger?.addEventListener('pointerenter', () => (enteredAt = performance.now()), {
              once: true,
            });
            new MutationObserver((_records, observer) => {
              if (!document.querySelector('[data-testid="stock-hover-card"]')) return;
              observer.disconnect();
              resolve(performance.now() - enteredAt);
            }).observe(document.body, { childList: true, subtree: true });
          })
      );
      await cashtag.hover();
      await expect(hoverCard(page)).toBeVisible();
      const elapsed = await openedAfter;
      expect(elapsed).toBeGreaterThanOrEqual(OPEN_DELAY_MS - OPEN_EARLY_TOLERANCE_MS);
      expect(elapsed).toBeLessThanOrEqual(OPEN_DELAY_MS + OPEN_LATE_TOLERANCE_MS);

      const card = hoverCard(page);
      await expect(card).toContainText('Türk Hava Yolları A.O.');
      await expect(card).toContainText(tr.legal.disclaimer.short);
      await expect(card.getByText('Son 24 saatte 214 gönderi')).toBeVisible();
      expect(await card.textContent()).not.toMatch(/₺|%\d/);
      for (const name of [/^KAP/, /^TradingView/]) {
        const link = card.getByRole('link', { name });
        await expect(link).toHaveAttribute('target', '_blank');
        const rel = ((await link.getAttribute('rel')) ?? '').split(/\s+/);
        expect(rel).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
      }
      // Auth bilinmiyor: "Takip et" yok, skeleton var ([HC-05])
      await expect(card.getByTestId('follow-skeleton')).toBeVisible();
      await expect(card.getByText(tr.hovercard.follow)).toHaveCount(0);

      expect(await seriousViolations(page)).toEqual([]);

      await page.mouse.move(0, 0);
      await expect(hoverCard(page)).toBeHidden();
    }
  );

  test(
    'sayaç hatasında kart açılır, sayaç satırı yok ([HC-07])',
    { tag: '@desktop' },
    async ({ page }) => {
      const cashtag = await gotoHydrated(page, `${PREVIEW}?stats=error`);
      await cashtag.hover();
      const card = hoverCard(page);
      await expect(card).toBeVisible();
      await expect(card.getByText(tr.hovercard.statsLoading)).toHaveCount(0);
      await expect(card).not.toContainText('Son 24 saatte');
      await expect(card).toContainText('Türk Hava Yolları A.O.');
    }
  );

  test(
    'anonim: "Takip et" girişe, dönüş yolu `next` ile götürür (auth-session kural 3)',
    { tag: '@desktop' },
    async ({ page }) => {
      const cashtag = await gotoHydrated(page, `${PREVIEW}?viewer=anonymous`);
      await cashtag.hover();
      await expect(
        hoverCard(page).getByRole('link', { name: tr.hovercard.follow })
      ).toHaveAttribute('href', `/giris?next=${encodeURIComponent(PREVIEW)}`);
    }
  );

  test(
    'mobil: dokunma kart açmadan /hisse/THYAO’ya gider ([HC-02], [ENT-R05])',
    { tag: '@mobile' },
    async ({ page }) => {
      await page.goto(PREVIEW);
      const cashtag = fixture(page, 1).getByRole('link', { name: CASHTAG_NAME });
      await cashtag.tap();
      await expect(page).toHaveURL(/\/hisse\/THYAO$/);
      await expect(hoverCard(page)).toHaveCount(0);
    }
  );
});

test.describe('PostCard', () => {
  test('sponsorlu etiket yazar adından önce ([LEG-03]), önizleme kartı tek link ([LPV-06])', async ({
    page,
  }) => {
    await page.goto(PREVIEW);
    const card = fixture(page, 2);
    const label = card.getByText(tr.post.sponsoredLabel);
    await expect(label).toBeVisible();
    const labelFirst = await card.evaluate(root => {
      const sponsored = root.querySelector('[data-slot="sponsored-label"]');
      const author = root.querySelector('[id$="-author"]');
      return Boolean(
        sponsored &&
        author &&
        sponsored.compareDocumentPosition(author) & Node.DOCUMENT_POSITION_FOLLOWING
      );
    });
    expect(labelFirst).toBe(true);
    // Legal: etiket gönderi gövdesinden küçük punto değil
    const [labelSize, bodySize] = await Promise.all([
      label.evaluate(e => parseFloat(getComputedStyle(e).fontSize)),
      card
        .locator('[data-slot="rich-text"]')
        .evaluate(e => parseFloat(getComputedStyle(e).fontSize)),
    ]);
    expect(labelSize).toBeGreaterThanOrEqual(bodySize);

    const preview = card.getByRole('link', {
      name: 'Borsa eğitim programı başladı, ornek.com (yeni sekmede açılır)',
    });
    await expect(preview).toHaveAttribute('href', 'https://ornek.com/haber');
    await expect(preview).toHaveAttribute('target', '_blank');
    await expect(preview.locator('img')).toHaveCount(0);
  });

  test('bekleyen önizleme hiçbir şey render etmez; görselde önizleme yok', async ({ page }) => {
    await gotoHydrated(page, PREVIEW);
    await expect(fixture(page, 3).locator('[data-slot^="link-preview"]')).toHaveCount(0);
    await expect(fixture(page, 3).locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(fixture(page, 5).locator('[data-slot="link-preview-card"]')).toHaveCount(0);
    const media = fixture(page, 5).getByRole('img', { name: tr.post.mediaAlt });
    await expect(media).toBeVisible();
    await expect(media).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  test('"Devamını gör" yeri sunucuda ayrılır: hidrasyon kart yüksekliğini değiştirmez (CLS)', async ({
    browser,
    page,
  }, testInfo) => {
    const cardHeights = (target: Page): Promise<Record<string, number>> =>
      target
        .locator('[data-testid^="fixture-"]')
        .evaluateAll(sections =>
          Object.fromEntries(
            sections.map(section => [
              section.getAttribute('data-testid') ?? '',
              section.getBoundingClientRect().height,
            ])
          )
        );

    // Yalnızca sunucu HTML'i: aynı cihaz ayarlarıyla, JS kapalı
    const ssrContext = await browser.newContext({
      ...testInfo.project.use,
      javaScriptEnabled: false,
    });
    const ssrPage = await ssrContext.newPage();
    await ssrPage.goto(PREVIEW);
    await ssrPage.evaluate(() => document.fonts.ready);
    const ssr = await cardHeights(ssrPage);
    await ssrContext.close();

    await gotoHydrated(page, PREVIEW);
    // İstemci ölçümü bitti: uzun gövdede buton görünür oldu
    await expect(fixture(page, 6).getByRole('button', { name: tr.post.readMore })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const hydrated = await cardHeights(page);

    expect(Object.keys(ssr).length).toBeGreaterThanOrEqual(6);
    for (const [id, height] of Object.entries(ssr)) {
      expect(hydrated[id], id).toBeCloseTo(height, 0);
    }
  });

  test('akışta 6 satır kırpma ve "Devamını gör"', async ({ page }) => {
    await gotoHydrated(page, PREVIEW);
    const card = fixture(page, 6);
    const more = card.getByRole('button', { name: tr.post.readMore });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    const body = card.locator('[id$="-body"]');
    const clamped = (await body.boundingBox())?.height ?? 0;
    await more.click();
    await expect(card.getByRole('button', { name: tr.post.readLess })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect((await body.boundingBox())?.height ?? 0).toBeGreaterThan(clamped);
    // Kısa gövdede buton yok
    await expect(fixture(page, 2).getByRole('button', { name: tr.post.readMore })).toHaveCount(0);
  });

  test(
    'zaman: göreli metin, tooltip’te tam tarih (Europe/Istanbul)',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto(PREVIEW);
      const time = fixture(page, 1).getByRole('link', { name: '3 dk. önce' });
      await expect(time).toHaveAttribute('href', '/gonderi/1');
      await time.hover();
      await expect(page.getByRole('tooltip')).toHaveText('10 Eki 2026 14:32');
    }
  );

  test('durumlar: loading iskeleti, hata ve boş durumu', async ({ page }) => {
    await page.goto(PREVIEW);
    await expect(page.getByTestId('post-card-skeleton')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByTestId('state-error').getByRole('alert')).toHaveText(tr.post.error);
    await expect(page.getByTestId('state-empty')).toContainText(tr.post.unavailable);
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`axe: serious/critical ihlal yok · ${theme} ([ENT-R09])`, async ({ page }) => {
      await page.addInitScript(value => {
        window.localStorage.setItem('theme', value);
      }, theme);
      await page.goto(PREVIEW);
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
      await expect(fixture(page, 1)).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test('yatay kaydırma yok (mobil genişlik)', { tag: '@mobile' }, async ({ page }) => {
    await page.goto(PREVIEW);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
