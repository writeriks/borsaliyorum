import { expect, type Page, test } from '@playwright/test';

import tr from '../../messages/tr.json' with { type: 'json' };

type ThemeEvent = { kind: 'class'; old: string | null } | { kind: 'content' };

declare global {
  interface Window {
    __themeEvents: ThemeEvent[];
  }
}

/**
 * Sayfa ayrıştırılırken <html> sınıf değişikliklerini ve ana içeriğin DOM'a girişini sırayla
 * kaydeder. Parser'ın eklediği her düğüm ve next-themes script'inin sınıf yazması MutationRecord
 * üretir; kayıt sırası gerçekleşme sırasıdır. Böylece "tema sınıfı içerikten önce mi geldi" ve
 * "yanlış tema hiç uygulandı mı" ilk boyamadan bağımsız ölçülür.
 */
const recordThemeTimeline = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.__themeEvents = [];
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes' && record.target === document.documentElement) {
          window.__themeEvents.push({ kind: 'class', old: record.oldValue });
        }
        if (record.type === 'childList') {
          for (const node of record.addedNodes) {
            if (
              node instanceof Element &&
              (node.id === 'icerik' || node.querySelector('#icerik') !== null)
            ) {
              window.__themeEvents.push({ kind: 'content' });
            }
          }
        }
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
  });
};

const readTimeline = async (page: Page): Promise<{ events: ThemeEvent[]; finalClass: string }> =>
  page.evaluate(() => ({
    events: window.__themeEvents,
    finalClass: document.documentElement.className,
  }));

const expectThemeAppliedBeforeContent = async (
  page: Page,
  expected: 'dark' | 'light'
): Promise<void> => {
  const opposite = expected === 'dark' ? 'light' : 'dark';
  const { events, finalClass } = await readTimeline(page);
  const firstClass = events.findIndex(event => event.kind === 'class');
  const firstContent = events.findIndex(event => event.kind === 'content');

  expect(firstContent, 'ana içerik kaydedilmedi').toBeGreaterThanOrEqual(0);
  expect(firstClass, 'tema sınıfı ana içerikten önce yazılmalı').toBeGreaterThanOrEqual(0);
  expect(firstClass).toBeLessThan(firstContent);
  // Karşı tema hiçbir anda <html>'de olmadı (sınıfın her önceki değeri + son değer)
  for (const event of events) {
    if (event.kind === 'class')
      expect(event.old ?? '').not.toMatch(new RegExp(`\\b${opposite}\\b`));
  }
  expect(finalClass.split(/\s+/)).toContain(expected);
  expect(finalClass.split(/\s+/)).not.toContain(opposite);
};

const bodyBackground = async (page: Page): Promise<string> =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

const chooseTheme = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('button', { name: tr.theme.toggle }).filter({ visible: true }).click();
  await page.getByRole('menuitemradio', { name }).click();
  await expect(page.getByRole('menu')).toBeHidden();
};

test.describe('tema', () => {
  test('ilk ziyaret koyu; sınıf içerikten önce, açık tema hiç görünmez', async ({ page }) => {
    // Sistem açık olsa bile varsayılan koyu (design-system: koyu varsayılan)
    await page.emulateMedia({ colorScheme: 'light' });
    await recordThemeTimeline(page);
    await page.goto('/');
    await expectThemeAppliedBeforeContent(page, 'dark');
    expect(await bodyBackground(page)).toBe('rgb(14, 16, 22)');
  });

  test('açık tema seçimi yenilemede flash olmadan korunur ve diğer sayfalara taşınır', async ({
    page,
  }) => {
    await page.goto('/');
    await chooseTheme(page, tr.theme.light);
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    expect(await bodyBackground(page)).toBe('rgb(249, 250, 251)');

    await recordThemeTimeline(page);
    await page.reload();
    await expectThemeAppliedBeforeContent(page, 'light');

    await page.goto('/en');
    await expectThemeAppliedBeforeContent(page, 'light');
    expect(await bodyBackground(page)).toBe('rgb(249, 250, 251)');
  });

  test('açıktan koyuya dönüş de kalıcı', async ({ page }) => {
    await page.goto('/');
    await chooseTheme(page, tr.theme.light);
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    await chooseTheme(page, tr.theme.dark);
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await recordThemeTimeline(page);
    await page.reload();
    await expectThemeAppliedBeforeContent(page, 'dark');
  });

  test('"Sistem" seçimi işletim sistemi temasını izler', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await chooseTheme(page, tr.theme.system);
    await expect(page.locator('html')).toHaveClass(/\blight\b/);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await recordThemeTimeline(page);
    await page.reload();
    await expectThemeAppliedBeforeContent(page, 'dark');
  });
});
