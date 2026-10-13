import { expect, test } from './support/test';

import {
  editor,
  editorText,
  expectCollapsedList,
  expectOpenList,
  listbox,
  openComposer,
  resolveTokenColor,
  stocksListbox,
  tr,
  typeInEditor,
} from './helpers/composer';

// Tasarım spec'i §2.8 (AC-*) ve §3.1 (ENT-E*). Veri: route mock'ları (S7 sözleşmesi).

test.describe('composer autocomplete', () => {
  test('[AC-01] boş editöre $ yazılınca hisse listbox açılır, takip edilenler listelenir', async ({
    page,
  }) => {
    await openComposer(page);
    await typeInEditor(page, '$');
    const list = stocksListbox(page);
    await expect(list).toBeVisible();
    await expectOpenList(page);
    await expect(page.getByText(tr.ac.heading.followedStocks)).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(2);
    await expect(list.getByRole('option').nth(0)).toHaveAccessibleName(/^THYAO,/);
    await expect(list.getByRole('option').nth(1)).toHaveAccessibleName(/^ASELS,/);
  });

  test('[AC-02] $th: ilk öğe THYAO, aria-selected ve aria-activedescendant', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$th');
    const first = stocksListbox(page).getByRole('option').first();
    await expect(first).toHaveAccessibleName('THYAO, Türk Hava Yolları A.O., BIST');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    const id = await first.getAttribute('id');
    expect(id).toBeTruthy();
    await expect(editor(page)).toHaveAttribute('aria-activedescendant', id ?? '');
  });

  test('[AC-03] $türk: THYAO ve TTKOM listelenir, THYAO önce', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$türk');
    const options = stocksListbox(page).getByRole('option');
    await expect(options.first()).toHaveAccessibleName(/^THYAO,/);
    await expect(stocksListbox(page).getByRole('option', { name: /^TTKOM,/ })).toBeVisible();
  });

  test('[AC-04] $sise ve $şişe aynı ilk sonucu (SISE) verir', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$sise');
    await expect(stocksListbox(page).getByRole('option').first()).toHaveAccessibleName(/^SISE,/);
    await page.keyboard.press('Escape');
    await page.keyboard.type(' $şişe');
    await expect(stocksListbox(page).getByRole('option').first()).toHaveAccessibleName(/^SISE,/);
  });

  test('[AC-05] $isctr + Enter → $ISCTR (İ yok)', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$isctr');
    await expect(stocksListbox(page).getByRole('option').first()).toHaveAccessibleName(/^ISCTR,/);
    await page.keyboard.press('Enter');
    expect(await editorText(page)).toBe('$ISCTR ');
  });

  test('[AC-06] $thyao + boşluk → $THYAO çözülür, entity stili, liste kapanır', async ({
    page,
  }) => {
    await openComposer(page);
    await typeInEditor(page, '$thyao');
    await expect(stocksListbox(page)).toBeVisible();
    await page.keyboard.type(' ');
    expect(await editorText(page)).toBe('$THYAO ');
    await expect(editor(page).locator('[data-entity="cashtag"]')).toHaveText('$THYAO');
    await expectCollapsedList(page);
  });

  test('[AC-07] $5, e-posta ve URL içi # liste açmaz', async ({ page }) => {
    await openComposer(page);
    for (const input of ['$5', ' mail@ornek.com', ' site.com/#a']) {
      await typeInEditor(page, input);
      await expectCollapsedList(page);
    }
  });

  test('[AC-24] IME kompozisyonu sürerken liste açık kalır (Android Gboard)', async ({ page }) => {
    // Gboard kelimeyi `compositionstart`–`compositionend` arasında yazar ve keydown kodu
    // göndermez: kompozisyon boyunca liste gizlenirse mobilde autocomplete hiç görünmez.
    await openComposer(page);
    await editor(page).click();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '$t', selectionStart: 2, selectionEnd: 2 });
    await expect(stocksListbox(page)).toBeVisible();
    await cdp.send('Input.imeSetComposition', { text: '$th', selectionStart: 3, selectionEnd: 3 });
    await expect(stocksListbox(page)).toBeVisible();
    await expect(stocksListbox(page).getByRole('option').first()).toHaveAccessibleName(/^THYAO,/);
    // Kompozisyon sürerken tuşlar yakalanmaz; commit sonrası metin olduğu gibi kalır
    await cdp.send('Input.insertText', { text: '$th' });
    expect(await editorText(page)).toBe('$th');
    await expect(stocksListbox(page)).toBeVisible();
  });

  test('[AC-08] ↓↓↑ ikinci öğe aktif; son öğede ↓ başa döner', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$türk');
    const options = stocksListbox(page).getByRole('option');
    await expect(options.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    const count = await options.count();
    for (let i = 1; i < count - 1; i += 1) await page.keyboard.press('ArrowDown');
    await expect(options.nth(count - 1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  });

  test('[AC-09] Esc listeyi kapatır, metin aynı; yeni karakterle yeniden açılır', async ({
    page,
  }) => {
    await openComposer(page);
    await typeInEditor(page, '$th');
    await expect(stocksListbox(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expectCollapsedList(page);
    expect(await editorText(page)).toBe('$th');
    await page.keyboard.type('y');
    await expect(stocksListbox(page)).toBeVisible();
    await expectOpenList(page);
  });

  test('[AC-10] liste açıkken Enter satır sonu eklemez; boş listede ekler', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$th');
    await expect(stocksListbox(page).getByRole('option').first()).toBeVisible();
    await page.keyboard.press('Enter');
    expect(await editorText(page)).toBe('$THYAO ');

    await page.keyboard.type('$zzzz');
    await expect(page.getByText('"zzzz" ile eşleşen hisse yok.')).toBeVisible();
    await page.keyboard.press('Enter');
    expect(await editorText(page)).toBe('$THYAO $zzzz\n');
  });

  test('[AC-11] #bi: #bist100 ilk sırada ve "12.345 gönderi"', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '#bi');
    const first = listbox(page, tr.ac.listbox.tags).getByRole('option').first();
    await expect(first).toHaveAccessibleName(/^#bist100,/);
    await expect(first).toContainText('12.345 gönderi');
  });

  test('[AC-12] @ay: takip edilen aysek önce, "Takip ediyorsun"', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '@ay');
    const options = listbox(page, tr.ac.listbox.users).getByRole('option');
    await expect(options.nth(0)).toContainText('@aysek');
    await expect(options.nth(1)).toContainText('@aysegul');
    await expect(options.nth(0)).toContainText(tr.ac.following);
  });

  test('[AC-13] @eng: engelleyen kullanıcı listede yok', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '@eng');
    await expect(page.getByText('"@eng" ile eşleşen kişi yok.')).toBeVisible();
    await expect(page.getByRole('option', { name: /engelli/ })).toHaveCount(0);
  });

  test('[AC-14] öneri satırlarında e-posta biçimli metin yok', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '@');
    const options = listbox(page, tr.ac.listbox.users).getByRole('option');
    await expect(options.first()).toBeVisible();
    for (const text of await options.allTextContents()) {
      expect(text).not.toMatch(/\S+@\S+\.\S+/);
    }
  });

  test('[AC-15] yavaş yanıtta 300 ms sonra 3 skeleton; hızlı yanıtta hiç yok', async ({
    page,
    browser,
  }) => {
    await openComposer(page, { mocks: { users: { delayMs: 1000 } } });
    await typeInEditor(page, '@');
    const skeleton = page.getByTestId('ac-skeleton');
    await expect(skeleton).toBeVisible({ timeout: 900 });
    await expect(skeleton.locator('[data-slot="skeleton"]').first()).toBeVisible();
    await expect(skeleton.locator(':scope > div')).toHaveCount(3);
    await expect(listbox(page, tr.ac.listbox.users).getByRole('option').first()).toBeVisible();

    // Ayrı bağlam: ilk sayfanın taslağı (localStorage) geri yüklenmesin
    const context = await browser.newContext({ locale: 'tr-TR' });
    const fast = await context.newPage();
    await openComposer(fast, { mocks: { users: { delayMs: 200 } } });
    await fast.evaluate(() => {
      (window as Window & { __sawSkeleton?: boolean }).__sawSkeleton = false;
      new MutationObserver(() => {
        if (document.querySelector('[data-testid="ac-skeleton"]')) {
          (window as Window & { __sawSkeleton?: boolean }).__sawSkeleton = true;
        }
      }).observe(document.body, { childList: true, subtree: true });
    });
    await typeInEditor(fast, '@');
    await expect(listbox(fast, tr.ac.listbox.users).getByRole('option').first()).toBeVisible();
    await fast.waitForTimeout(400);
    expect(
      await fast.evaluate(() => (window as Window & { __sawSkeleton?: boolean }).__sawSkeleton)
    ).toBe(false);
    await context.close();
  });

  test('[AC-16] 500 → "Öneriler yüklenemedi." + "Tekrar dene" option; Enter yeniden ister', async ({
    page,
  }) => {
    const log = await openComposer(page, { mocks: { users: { status: 500 } } });
    await typeInEditor(page, '@');
    await expect(page.getByText(tr.ac.error)).toBeVisible();
    const retry = page.getByRole('option', { name: tr.common.retry });
    await expect(retry).toBeVisible();
    const before = log.users.length;
    await page.keyboard.press('Enter');
    await expect.poll(() => log.users.length).toBeGreaterThan(before);
    expect(await editorText(page)).toBe('@');
  });

  test('[AC-17] $zzzz: boş durum metni, seçilebilir option yok', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$zzzz');
    await expect(page.getByText('"zzzz" ile eşleşen hisse yok.')).toBeVisible();
    await expect(page.getByTestId('ac-popup').getByRole('option')).toHaveCount(0);
  });

  test('[AC-18] canlı bölge "öneri" ve sonuç sayısını içerir', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$türk');
    await expect(page.getByTestId('ac-live')).toHaveText(/^5 öneri\./);
  });

  test(
    '[AC-19] 375 px: listbox tam genişlik, alt kenarı toolbar üstüne bitişik',
    { tag: '@mobile' },
    async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await openComposer(page, { variant: 'sheet' });
      await typeInEditor(page, '$');
      const list = stocksListbox(page);
      await expect(list.getByRole('option').first()).toBeVisible();
      const listRect = await list.boundingBox();
      const toolbarRect = await page
        .getByRole('toolbar', { name: tr.composer.toolbar.label })
        .boundingBox();
      if (!listRect || !toolbarRect) throw new Error('ölçülemedi');
      expect(Math.abs(listRect.width - 375)).toBeLessThanOrEqual(1);
      // Toolbar satırının üst kenarı (butonlar dikey ortalı; satır = toolbar kapsayıcısı)
      const rowTop = await page
        .getByRole('toolbar', { name: tr.composer.toolbar.label })
        .evaluate(node => node.parentElement?.getBoundingClientRect().top ?? 0);
      expect(Math.abs(listRect.y + listRect.height - rowTop)).toBeLessThanOrEqual(1);
    }
  );

  test(
    '[AC-20] md+: listbox sol kenarı $ karakterinin ≤ 8 px yakınında',
    { tag: '@desktop' },
    async ({ page }) => {
      await openComposer(page);
      await typeInEditor(page, 'Bugün $');
      const list = stocksListbox(page);
      await expect(list.getByRole('option').first()).toBeVisible();
      const caretLeft = await editor(page).evaluate(node => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
          const at = text.textContent?.indexOf('$') ?? -1;
          if (at >= 0) {
            const range = document.createRange();
            range.setStart(text, at);
            range.setEnd(text, at + 1);
            return range.getBoundingClientRect().left;
          }
        }
        return Number.NaN;
      });
      const listRect = await list.boundingBox();
      if (!listRect) throw new Error('ölçülemedi');
      expect(Math.abs(listRect.x - caretLeft)).toBeLessThanOrEqual(8);
    }
  );

  test('[AC-21] fareyle tıklama ekler, editör odakta kalır', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$as');
    await stocksListbox(page)
      .getByRole('option', { name: /^ASELS,/ })
      .click();
    expect(await editorText(page)).toBe('$ASELS ');
    await expect(editor(page)).toBeFocused();
  });

  test('[AC-22] $th| dedi: seçim çift boşluk üretmez', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$th dedi');
    for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowLeft');
    await expect(stocksListbox(page).getByRole('option').first()).toHaveAccessibleName(/^THYAO,/);
    await page.keyboard.press('Enter');
    expect(await editorText(page)).toBe('$THYAO dedi');
  });
});

test.describe('composer entity vurgusu (editör)', () => {
  test('[ENT-E01] seçilen $THYAO: zemin --accent-subtle, ağırlık çevre metinle aynı', async ({
    page,
  }) => {
    await openComposer(page);
    await typeInEditor(page, 'Bak $thy');
    await page.keyboard.press('Enter');
    const token = editor(page).locator('[data-entity="cashtag"]');
    await expect(token).toHaveText('$THYAO');
    const expected = await resolveTokenColor(page, '--accent-subtle');
    const styles = await token.evaluate(node => ({
      background: getComputedStyle(node).backgroundColor,
      weight: getComputedStyle(node).fontWeight,
      parentWeight: getComputedStyle(node.parentElement ?? node).fontWeight,
    }));
    expect(styles.background).toBe(expected);
    expect(styles.weight).toBe(styles.parentWeight);
  });

  test('[ENT-E02] çözülmüş $THYAO sonunda Backspace → $THYA ve liste açılır', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$thyao ');
    await expect(editor(page).locator('[data-entity="cashtag"]')).toHaveText('$THYAO');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    expect(await editorText(page)).toBe('$THYA');
    await expect(stocksListbox(page)).toBeVisible();
  });

  test('[ENT-E03] eşleşmesiz $ZZZZ: entity stili yok, bilinmeyen işareti var', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$ZZZZ ');
    await expect(editor(page).locator('.cmp-entity')).toHaveCount(0);
    await expect(editor(page).locator('[data-entity="unknown"]')).toHaveText('$ZZZZ');
    await expect(page.getByText(/Tanınmayan hisse kodu: \$ZZZZ/)).toBeVisible();
    await expect(page.getByTestId('composer-submit')).toHaveAttribute('aria-disabled', 'true');
  });

  test('[ENT-E04] editörde URL kısaltılmadan tam görünür', async ({ page }) => {
    await openComposer(page);
    const url = 'https://www.kap.org.tr/tr/Bildirim/1234567';
    await typeInEditor(page, `${url} `);
    await expect(editor(page).locator('[data-entity="url"]')).toHaveText(url);
    await expect(editor(page)).toContainText(url);
  });
});
