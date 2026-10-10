import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import {
  editor,
  editorText,
  openComposer,
  stocksListbox,
  submitButton,
  tr,
  typeInEditor,
} from './helpers/composer';

// Tasarım spec'i §7 (A11Y-*) ve §2.8 [AC-23]. Etiketler [A11Y-01]'deki küme.
const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

type Violation = { id: string; impact: string; targets: string[] };

const scan = async (page: Page, include?: string): Promise<Violation[]> => {
  let builder = new AxeBuilder({ page }).withTags(A11Y_TAGS);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  return results.violations.map(violation => ({
    id: violation.id,
    impact: violation.impact ?? '',
    targets: violation.nodes.map(node => node.target.join(' ')),
  }));
};

const setTheme = async (page: Page, theme: 'dark' | 'light'): Promise<void> => {
  await page.addInitScript(value => window.localStorage.setItem('theme', value), theme);
};

test.describe('composer erişilebilirlik', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`[A11Y-01] ${theme}: dialog + açık autocomplete + hata bandında axe ihlali yok`, async ({
      page,
    }) => {
      await setTheme(page, theme);
      await openComposer(page, { variant: 'dialog', outcome: 'internal' });
      await page.getByRole('button', { name: tr.shell.composeCta }).click();
      await expect(editor(page)).toBeFocused();
      await page.keyboard.type('Hata bandı');
      await submitButton(page).click();
      await expect(page.getByTestId('composer-error')).toBeVisible();
      await editor(page).click();
      await page.keyboard.press('End');
      await page.keyboard.type(' $th');
      await expect(stocksListbox(page).getByRole('option').first()).toBeVisible();
      // Radix dialog arka planı `aria-hidden` yapar; tarama dialog içeriğiyle sınırlı
      expect(await scan(page, '[role="dialog"]')).toEqual([]);
    });
  }

  test('[AC-23] açık listbox ile aria-* ihlali yok (tam sayfa)', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '@');
    await expect(
      page.getByRole('listbox', { name: tr.ac.listbox.users }).getByRole('option').first()
    ).toBeVisible();
    const violations = await scan(page);
    expect(violations.filter(v => v.id.startsWith('aria'))).toEqual([]);
    expect(violations).toEqual([]);
  });

  test('[A11Y-02] yalnızca klavye: yaz → $th → Enter → Yükseliş → Ctrl+Enter → toast', async ({
    page,
  }) => {
    await openComposer(page);
    await expect(editor(page)).toBeVisible();
    // Sayfa başından Tab ile editöre ulaşılır (fare yok)
    await page.locator('body').focus();
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab');
      if (await editor(page).evaluate(node => node === document.activeElement)) break;
    }
    await expect(editor(page)).toBeFocused();
    await page.keyboard.type('Bilanço güçlü $th');
    await expect(stocksListbox(page)).toBeVisible();
    await page.keyboard.press('Enter');
    expect(await editorText(page)).toBe('Bilanço güçlü $THYAO ');

    // Editör → radiogroup (seçili Nötr tek tab durağı) → ok tuşlarıyla Yükseliş
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: tr.composer.sentiment.neutral })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: tr.composer.sentiment.bullish })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByRole('radio', { name: tr.composer.sentiment.bullish })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await page.keyboard.press('Control+Enter');
    await expect(page.getByText(tr.composer.success.post)).toBeVisible();
    await expect(page.getByTestId('dev-payload')).toContainText('"sentiment":"bullish"');
  });

  test('[A11Y-03] 320 px ve %200 metin ölçeğinde yatay kaydırma yok', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openComposer(page);
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await typeInEditor(page, '$thyao bilanço https://www.kap.org.tr/tr/Bildirim/1234567 ');
    await expect(page.getByRole('radiogroup', { name: tr.composer.sentiment.label })).toBeVisible();
    // Ölçüm composer'a özgü: kabuk (tab bar) ve geliştirme kontrolleri bu dilimin dışında
    const overflow = await page.getByTestId('composer').evaluate(node => {
      const right = node.getBoundingClientRect().right;
      const widest = Math.max(
        ...[...node.querySelectorAll('*')].map(child => child.getBoundingClientRect().right)
      );
      return {
        scroll: node.scrollWidth - node.clientWidth,
        outside: Math.round(widest - right),
        viewport: Math.round(right - window.innerWidth),
      };
    });
    expect(overflow.scroll).toBeLessThanOrEqual(0);
    expect(overflow.outside).toBeLessThanOrEqual(0);
    expect(overflow.viewport).toBeLessThanOrEqual(0);
  });
});
