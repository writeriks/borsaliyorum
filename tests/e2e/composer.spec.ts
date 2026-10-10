import { expect, type Page, test } from '@playwright/test';

import {
  dropInEditor,
  editor,
  editorText,
  openComposer,
  pasteInEditor,
  resolveTokenColor,
  stocksListbox,
  submitButton,
  tr,
  typeInEditor,
} from './helpers/composer';

// Tasarım spec'i §1 (CMP, CNT, SEN, LEG, SND, DRF, AUTH) ve §6 (LPV). Gönderme sonucu
// `/dev/composer` önizlemesinin sahte `onSubmit`'i ile seçilir (S10 action'ları gelene kadar).

const DRAFT_KEY = 'bz:draft:42:post';

const calls = (page: Page): Promise<number> =>
  page
    .getByTestId('dev-calls')
    .textContent()
    .then(text => Number(/\d+/.exec(text ?? '')?.[0] ?? Number.NaN));

const lastPayload = async (page: Page): Promise<Record<string, unknown>> =>
  JSON.parse((await page.getByTestId('dev-payload').textContent()) ?? '{}') as Record<
    string,
    unknown
  >;

const selectOutcome = (page: Page, label: string): Promise<string[]> =>
  page.getByRole('combobox', { name: tr.devComposer.outcome }).selectOption({ label });

/** Kullanıcı gibi: görünür seçenek etiketine dokunur (yerel radio görsel olarak gizli). */
const selectSentiment = (page: Page, name: string): Promise<void> =>
  page.getByRole('radiogroup').locator('label').filter({ hasText: name }).click();

const readDraft = (page: Page, key = DRAFT_KEY): Promise<string | null> =>
  page.evaluate(name => window.localStorage.getItem(name), key);

test.describe('composer: varyantlar ve klavye', () => {
  test(
    '[CMP-01] md+ akış başında "Gönderi yaz" textbox ve placeholder',
    { tag: '@desktop' },
    async ({ page }) => {
      await openComposer(page);
      const box = editor(page);
      await expect(box).toBeVisible();
      await expect(box.locator('p[data-placeholder]')).toHaveAttribute(
        'data-placeholder',
        tr.composer.placeholder.post
      );
    }
  );

  test(
    '[CMP-02] inline: boş ve odaksız ≤ 72 px, toolbar yok; odakta açılır, boş blur kapanır',
    { tag: '@desktop' },
    async ({ page }) => {
      await openComposer(page);
      const composer = page.getByTestId('composer');
      const toolbar = page.getByRole('toolbar', { name: tr.composer.toolbar.label });
      await expect(editor(page)).toBeVisible();
      expect((await composer.boundingBox())?.height).toBeLessThanOrEqual(72);
      await expect(toolbar).toHaveCount(0);
      await editor(page).click();
      await expect(toolbar).toBeVisible();
      await page.getByRole('heading', { level: 1 }).click();
      await expect(toolbar).toHaveCount(0);
      expect((await composer.boundingBox())?.height).toBeLessThanOrEqual(72);
    }
  );

  test(
    '[CMP-04] mobil sheet: görünür alan küçülünce toolbar en altta, Paylaş görünür',
    { tag: '@mobile' },
    async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await openComposer(page, { variant: 'sheet' });
      await expect(editor(page)).toBeFocused();
      // Sanal klavye: görünür alan (visualViewport) yüksekliği küçülür
      await page.setViewportSize({ width: 375, height: 360 });
      const toolbarRow = page
        .getByRole('toolbar', { name: tr.composer.toolbar.label })
        .locator('xpath=..');
      await expect
        .poll(async () => {
          const rect = await toolbarRow.boundingBox();
          return rect ? Math.round(rect.y + rect.height) : -1;
        })
        .toBe(360);
      await expect(submitButton(page)).toBeInViewport();
    }
  );

  test('[CMP-05] $ butonu tetikleyiciyi (gerekirse boşlukla) ekler ve listeyi açar', async ({
    page,
  }) => {
    await openComposer(page);
    await typeInEditor(page, 'abc');
    await page.getByRole('button', { name: tr.composer.toolbar.cashtag }).click();
    expect(await editorText(page)).toBe('abc $');
    await expect(stocksListbox(page)).toBeVisible();
    await expect(editor(page)).toBeFocused();
  });

  test('[CMP-06] mobilde editör yazı boyutu ≥ 16 px', { tag: '@mobile' }, async ({ page }) => {
    await openComposer(page, { variant: 'sheet' });
    const size = await editor(page).evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
  });

  test('[CMP-07] Ctrl+Enter geçerli içerikte gönderir, boşta hiçbir şey yapmaz', async ({
    page,
  }) => {
    await openComposer(page);
    await editor(page).click();
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(200);
    expect(await calls(page)).toBe(0);
    await page.keyboard.type('Merhaba');
    await page.keyboard.press('Control+Enter');
    await expect.poll(() => calls(page)).toBe(1);
  });

  test('[CMP-08] zengin metin yapıştırılınca yalnızca düz metin eklenir', async ({ page }) => {
    await openComposer(page);
    await pasteInEditor(
      page,
      'Kalın metin\nikinci satır',
      '<p><b style="color:red">Kalın</b> <i>metin</i></p><p>ikinci satır</p><script>x()</script>'
    );
    expect(await editorText(page)).toBe('Kalın metin\nikinci satır');
    await expect(editor(page).locator('b, i, script, [style]')).toHaveCount(0);
  });

  test('[CMP-08b] bırakılan (drop) HTML düz metin olarak, normalize edilerek eklenir', async ({
    page,
  }) => {
    await openComposer(page);
    // Yalnızca text/html: ProseMirror'ın HTML ayrıştırıcısı normalize etmeden ekliyordu
    await dropInEditor(page, {
      html: '<p><b style="color:red">$TH\u200bYAO</b> <i>hedef\u202e</i></p><p>ikinci</p>',
    });
    await expect.poll(() => editorText(page)).toBe('$THYAO hedef\nikinci');
    await expect(editor(page).locator('b, i, [style]')).toHaveCount(0);
  });

  test('[CMP-08c] bırakılan düz metin de normalize edilir', async ({ page }) => {
    await openComposer(page);
    await dropInEditor(page, { text: 'a\u200bb\r\nc' });
    await expect.poll(() => editorText(page)).toBe('ab\nc');
  });

  test('[CMP-08d] 25.000 karakter yapıştırma 20.000’de kırpılır', async ({ page }) => {
    await openComposer(page);
    await pasteInEditor(page, 'x'.repeat(25_000));
    await expect.poll(async () => (await editorText(page)).length).toBe(20_000);
  });

  test(
    '[CMP-09] dialog: Esc önce autocomplete’i, sonra dialog’u kapatır',
    { tag: '@desktop' },
    async ({ page }) => {
      await openComposer(page, { variant: 'dialog' });
      await page.getByRole('button', { name: tr.shell.composeCta }).click();
      const dialog = page.getByRole('dialog', { name: tr.composer.title });
      await expect(editor(page)).toBeFocused();
      await page.keyboard.type('$');
      await expect(stocksListbox(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(stocksListbox(page)).toHaveCount(0);
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
  );
});

test.describe('composer: karakter sayacı', () => {
  test('[CNT-01] 799 karakterde sayaç yok, 800’de "200"', async ({ page }) => {
    await openComposer(page);
    await pasteInEditor(page, 'a'.repeat(799));
    await expect(page.getByTestId('char-counter')).toHaveAttribute('data-tone', 'hidden');
    await expect(page.getByTestId('char-counter-value')).toHaveCount(0);
    await page.keyboard.type('a');
    await expect(page.getByTestId('char-counter-value')).toHaveText('200');
  });

  test('[CNT-02] 985 karakterde sayaç rengi --warn', async ({ page }) => {
    await openComposer(page);
    await pasteInEditor(page, 'a'.repeat(985));
    const counter = page.getByTestId('char-counter');
    await expect(counter).toHaveAttribute('data-tone', 'warn');
    const warn = await resolveTokenColor(page, '--warn');
    await expect(counter).toHaveCSS('color', warn);
  });

  test('[CNT-03] 1012 karakter: kesme yok, -12, Paylaş pasif, aşan 12 karakter işaretli', async ({
    page,
  }) => {
    await openComposer(page);
    await pasteInEditor(page, 'b'.repeat(1012));
    expect((await editorText(page)).length).toBe(1012);
    await expect(page.getByTestId('char-counter-value')).toHaveText('-12');
    await expect(submitButton(page)).toHaveAttribute('aria-disabled', 'true');
    const overflow = await editor(page)
      .locator('[data-overflow]')
      .evaluateAll(nodes => nodes.map(node => node.textContent ?? '').join(''));
    expect(overflow).toBe('b'.repeat(12));
  });

  test('[CNT-04] ZWJ emoji 1, "ğüşıöç" 6 karakter sayılır', async ({ page }) => {
    await openComposer(page);
    await pasteInEditor(page, `${'a'.repeat(799)}👨‍👩‍👧`);
    await expect(page.getByTestId('char-counter-value')).toHaveText('200');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await pasteInEditor(page, `${'a'.repeat(794)}ğüşıöç`);
    await expect(page.getByTestId('char-counter-value')).toHaveText('200');
  });

  test('[CNT-05] kalan 20’de live region bir kez duyurur, 19’da ek duyuru yok', async ({
    page,
  }) => {
    await openComposer(page);
    await pasteInEditor(page, 'c'.repeat(979));
    const live = page.getByTestId('char-counter-live');
    await page.keyboard.type('c');
    await expect(live).toHaveText('Kalan karakter: 20');
    await page.keyboard.type('c');
    await page.waitForTimeout(200);
    await expect(live).toHaveText('Kalan karakter: 20');
  });

  test('[CNT-06] yorumda sınır 500: 400’de sayaç görünür', async ({ page }) => {
    await openComposer(page, { variant: 'comment' });
    await pasteInEditor(page, 'd'.repeat(399), undefined, 'comment');
    await expect(page.getByTestId('char-counter')).toHaveAttribute('data-tone', 'hidden');
    await page.keyboard.type('d');
    await expect(page.getByTestId('char-counter-value')).toHaveText('100');
  });
});

test.describe('composer: duyarlılık', () => {
  test('[SEN-01] cashtag yokken "Görüşün" radiogroup yok', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, 'Piyasa sakin #bist100');
    await expect(page.getByRole('radiogroup', { name: tr.composer.sentiment.label })).toHaveCount(
      0
    );
  });

  test('[SEN-02] $THYAO seçilince radiogroup görünür, Nötr seçili', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$thy');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('radiogroup', { name: tr.composer.sentiment.label })).toBeVisible();
    await expect(page.getByRole('radio', { name: tr.composer.sentiment.neutral })).toBeChecked();
  });

  test('[SEN-03] ok tuşlarıyla gezilir, radiogroup tek tab durağı', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$thyao ');
    const neutral = page.getByRole('radio', { name: tr.composer.sentiment.neutral });
    await neutral.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('radio', { name: tr.composer.sentiment.bearish })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('radio', { name: tr.composer.sentiment.bullish })).toBeFocused();
    // Ok tuşu seçimi de taşır (yerel radio); grup tek tab durağı: Tab gruptan çıkar
    await expect(page.getByRole('radio', { name: tr.composer.sentiment.bullish })).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('radio', { name: tr.composer.sentiment.bearish })
    ).not.toBeFocused();
    await expect(
      page.getByRole('radio', { name: tr.composer.sentiment.neutral })
    ).not.toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('radio', { name: tr.composer.sentiment.bullish })).toBeFocused();
  });

  test('[SEN-04] Yükseliş seçilip gönderilince gönderi bullish olarak iletilir', async ({
    page,
  }) => {
    await openComposer(page);
    await typeInEditor(page, '$thyao ');
    await selectSentiment(page, tr.composer.sentiment.bullish);
    // Yön yalnızca renkle değil: seçeneğin görünür metninde glif var
    await expect(
      page
        .getByRole('radiogroup')
        .locator('label', { has: page.getByRole('radio', { name: tr.composer.sentiment.bullish }) })
    ).toContainText('▲');
    await submitButton(page).click();
    await expect.poll(() => calls(page)).toBe(1);
    expect((await lastPayload(page)).sentiment).toBe('bullish');
  });

  test('[SEN-05] cashtag silinince radiogroup kaybolur, gönderi neutral', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$thyao ');
    await selectSentiment(page, tr.composer.sentiment.bullish);
    await editor(page).click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Sadece metin');
    await expect(page.getByRole('radiogroup')).toHaveCount(0);
    await submitButton(page).click();
    await expect.poll(() => calls(page)).toBe(1);
    expect((await lastPayload(page)).sentiment).toBe('neutral');
  });
});

test.describe('composer: yasal öğeler', () => {
  for (const variant of ['inline', 'dialog', 'sheet'] as const) {
    test(`[LEG-01] ${variant}: kısa uyarı ve "Ayrıntılar" görünür, kapatma yok`, async ({
      page,
    }) => {
      await openComposer(page, { variant });
      if (variant === 'dialog') {
        await page.getByRole('button', { name: tr.shell.composeCta }).click();
      }
      const scope = page.getByTestId('composer');
      await expect(scope.getByText(tr.legal.disclaimer.short)).toBeVisible();
      await expect(scope.getByRole('link', { name: tr.legal.disclaimer.more })).toHaveAttribute(
        'href',
        '/yasal/yatirim-uyarisi'
      );
    });
  }

  test('[LEG-02] sponsorluk anahtarı switch, kapalı başlar, adı etiket metni', async ({ page }) => {
    await openComposer(page);
    await editor(page).click();
    const toggle = page.getByRole('switch', { name: tr.composer.sponsored.label });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('[LEG-03] anahtar açılınca "Reklam / İşbirliği" önizlemesi editörün üstünde', async ({
    page,
  }) => {
    await openComposer(page);
    await typeInEditor(page, 'Ortak çalışma');
    await page.getByRole('switch', { name: tr.composer.sponsored.label }).click();
    const preview = page.getByTestId('composer').getByText(tr.composer.sponsored.preview, {
      exact: true,
    });
    await expect(preview).toBeVisible();
    const previewBox = await preview.boundingBox();
    const editorBox = await editor(page).boundingBox();
    expect((previewBox?.y ?? 0) + (previewBox?.height ?? 0)).toBeLessThanOrEqual(editorBox?.y ?? 0);
  });

  test('[LEG-04] sponsorlu gönderiden sonra anahtar kapalı', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, 'Ortak çalışma');
    await page.getByRole('switch', { name: tr.composer.sponsored.label }).click();
    await submitButton(page).click();
    await expect(page.getByText(tr.composer.success.post)).toBeVisible();
    expect((await lastPayload(page)).isSponsored).toBe(true);
    await editor(page).click();
    await expect(page.getByRole('switch', { name: tr.composer.sponsored.label })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  test('[LEG-05] yorumda sponsorluk anahtarı yok', async ({ page }) => {
    await openComposer(page, { variant: 'comment' });
    await editor(page, 'comment').click();
    await expect(page.getByRole('switch')).toHaveCount(0);
  });

  test('[LEG-06] yorum: kapalıyken uyarı yok, odakta kısa yorum uyarısı', async ({ page }) => {
    await openComposer(page, { variant: 'comment' });
    await expect(editor(page, 'comment')).toBeVisible();
    await expect(page.getByText(tr.legal.disclaimer.comment)).toHaveCount(0);
    await editor(page, 'comment').click();
    await expect(page.getByText(tr.legal.disclaimer.comment)).toBeVisible();
  });

  test('[LEG-07] sponsorlu + tanınmış cashtag: Paylaş pasif ve mesaj', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '$thyao ');
    await page.getByRole('switch', { name: tr.composer.sponsored.label }).click();
    await expect(page.getByText(tr.composer.sponsored.cashtagBlocked)).toBeVisible();
    await expect(submitButton(page)).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled buton odaklanabilir ve tıklanabilir kalır; tıklama istek atmamalı
    await submitButton(page).dispatchEvent('click');
    await page.waitForTimeout(200);
    expect(await calls(page)).toBe(0);
  });
});

test.describe('composer: gönderme durumları', () => {
  test('[SND-01] yalnızca boşluk ve satır sonu → Paylaş aria-disabled', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, '   ');
    await page.keyboard.press('Enter');
    await expect(submitButton(page)).toHaveAttribute('aria-disabled', 'true');
  });

  test('[SND-02] gönderilirken "Paylaşılıyor" + aria-busy, ikinci tık istek atmaz', async ({
    page,
  }) => {
    await openComposer(page, { delay: 2000 });
    await typeInEditor(page, 'Merhaba');
    await submitButton(page).click();
    await expect(submitButton(page)).toHaveText(tr.composer.submitting);
    await expect(submitButton(page)).toHaveAttribute('aria-busy', 'true');
    await submitButton(page).click({ force: true });
    await expect(page.getByText(tr.composer.success.post)).toBeVisible({ timeout: 5000 });
    expect(await calls(page)).toBe(1);
    const payload = await lastPayload(page);
    expect(payload.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('[SND-03] başarıda toast ve editör boşalır', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, 'İlk gönderim');
    await submitButton(page).click();
    await expect(page.getByText(tr.composer.success.post)).toBeVisible();
    await expect(page.getByRole('button', { name: tr.composer.success.view })).toBeVisible();
    expect(await editorText(page)).toBe('');
  });

  test('[SND-04] 500 → alert, metin korunur; Tekrar dene yeni istek atar', async ({ page }) => {
    await openComposer(page, { outcome: 'internal' });
    await typeInEditor(page, 'Korunacak metin');
    await submitButton(page).click();
    const alert = page.getByTestId('composer-error');
    await expect(alert).toHaveAttribute('role', 'alert');
    await expect(alert).toContainText('Gönderin paylaşılamadı.');
    await expect(alert).toBeVisible();
    expect(await editorText(page)).toBe('Korunacak metin');
    const firstId = (await lastPayload(page)).clientRequestId;
    await selectOutcome(page, tr.devComposer.outcomes.ok);
    await alert.getByRole('button', { name: tr.common.retry }).click();
    await expect(page.getByText(tr.composer.success.post)).toBeVisible();
    expect(await calls(page)).toBe(2);
    // Aynı içerikle yeniden deneme aynı idempotency anahtarını taşır
    expect((await lastPayload(page)).clientRequestId).toBe(firstId);
  });

  test('[SND-05] 429 → hız sınırı metni', async ({ page }) => {
    await openComposer(page, { outcome: 'rateLimited' });
    await typeInEditor(page, 'Hızlı');
    await submitButton(page).click();
    await expect(page.getByTestId('composer-error')).toContainText(tr.composer.error.rateLimit);
  });

  test('[SND-06] 401 → taslak kaydedilir ve "Giriş yap" görünür', async ({ page }) => {
    await openComposer(page, { outcome: 'unauthenticated' });
    await typeInEditor(page, 'Oturum düştü');
    await submitButton(page).click();
    const alert = page.getByTestId('composer-error').filter({ hasText: tr.composer.error.session });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole('link', { name: tr.common.login })).toBeVisible();
    expect(await readDraft(page)).toContain('Oturum düştü');
  });

  test(
    '[SND-07] dialog başarıyla gönderilince kapanır, odak "Gönderi paylaş"a döner',
    { tag: '@desktop' },
    async ({ page }) => {
      await openComposer(page, { variant: 'dialog' });
      const trigger = page.getByRole('button', { name: tr.shell.composeCta });
      await trigger.click();
      await expect(editor(page)).toBeFocused();
      await page.keyboard.type('Dialogdan');
      await submitButton(page).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  );
});

test.describe('composer: taslak', () => {
  test('[DRF-01] 600 ms sonra taslak localStorage’da', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, 'Taslak metni');
    await page.waitForTimeout(600);
    expect(JSON.parse((await readDraft(page)) ?? '{}')).toMatchObject({ text: 'Taslak metni' });
  });

  test('[DRF-02] yenileyince taslak geri gelir; "Taslağı sil" boşaltır ve anahtarı siler', async ({
    page,
  }) => {
    await openComposer(page);
    await typeInEditor(page, 'Geri gelecek');
    await expect.poll(() => readDraft(page)).toContain('Geri gelecek');
    await page.reload();
    await expect(editor(page)).toHaveText('Geri gelecek');
    await expect(page.getByText(tr.composer.draft.restored)).toBeVisible();
    await page.getByRole('button', { name: tr.composer.draft.discard }).click();
    expect(await editorText(page)).toBe('');
    await expect.poll(() => readDraft(page)).toBeNull();
  });

  test(
    '[DRF-03] içerik varken dialog kapatılınca soru; "Sil" anahtarı siler',
    { tag: '@desktop' },
    async ({ page }) => {
      await openComposer(page, { variant: 'dialog' });
      await page.getByRole('button', { name: tr.shell.composeCta }).click();
      await expect(editor(page)).toBeFocused();
      await page.keyboard.type('Yarım kalan');
      await expect.poll(() => readDraft(page)).toContain('Yarım kalan');
      await page.keyboard.press('Escape');
      const confirm = page.getByRole('alertdialog', { name: tr.composer.draft.confirmTitle });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: tr.composer.draft.delete }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect.poll(() => readDraft(page)).toBeNull();
    }
  );

  test('[DRF-05] başarılı gönderiden sonra taslak anahtarı silinir', async ({ page }) => {
    await openComposer(page);
    await typeInEditor(page, 'Gidecek taslak');
    await expect.poll(() => readDraft(page)).toContain('Gidecek taslak');
    await submitButton(page).click();
    await expect(page.getByText(tr.composer.success.post)).toBeVisible();
    await expect.poll(() => readDraft(page)).toBeNull();
  });

  test('[DRF-06] yorum taslağı gönderiye özel', async ({ page }) => {
    await openComposer(page, { variant: 'comment', postId: 1 });
    await typeInEditor(page, 'A gönderisine yorum', 'comment');
    await expect.poll(() => readDraft(page, 'bz:draft:42:comment:1')).toContain('A gönderisine');
    await openComposer(page, { variant: 'comment', postId: 2 });
    await expect(editor(page, 'comment')).toBeVisible();
    expect(await editorText(page, 'comment')).toBe('');
  });
});

test.describe('composer: link önizleme ve auth', () => {
  test('[LPV-01] URL yazılınca önce skeleton, sonra başlıklı kart', async ({ page }) => {
    await openComposer(page, { mocks: { linkPreview: { delayMs: 800 } } });
    await typeInEditor(page, 'https://ornek.com/haber ');
    await expect(page.getByTestId('link-preview-skeleton')).toBeVisible();
    await expect(page.getByText('THYAO yeni hat açıyor')).toBeVisible();
  });

  test('[LPV-02] "Önizlemeyi kaldır" sonrası kart yok, gönderide önizleme yok', async ({
    page,
  }) => {
    await openComposer(page);
    await typeInEditor(page, 'https://ornek.com/haber ');
    await expect(page.getByText('THYAO yeni hat açıyor')).toBeVisible();
    await page.getByRole('button', { name: tr.composer.linkPreview.remove }).click();
    await expect(page.getByTestId('composer-link-preview')).toHaveCount(0);
    await submitButton(page).click();
    await expect.poll(() => calls(page)).toBe(1);
    expect((await lastPayload(page)).previewUrl).toBeNull();
  });

  test('[LPV-03] önizleme 500 → hata metni yok, Paylaş etkin', async ({ page }) => {
    const log = await openComposer(page, { mocks: { linkPreview: { status: 500 } } });
    await typeInEditor(page, 'https://ornek.com/haber ');
    await expect.poll(() => log.linkPreview.length).toBeGreaterThan(0);
    await expect(page.getByTestId('composer-link-preview')).toHaveCount(0);
    await expect(page.getByTestId('composer-error')).toHaveCount(0);
    await expect(submitButton(page)).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('[AUTH-01] auth bilinmiyorken skeleton, "Giriş yap" yok', async ({ page }) => {
    await openComposer(page, { auth: 'unknown' });
    await expect(page.getByTestId('composer-skeleton')).toBeVisible();
    await expect(page.getByRole('main').getByText(tr.common.login)).toHaveCount(0);
  });

  test('[AUTH-03] anonimde "Gönderi yaz" yok, giriş çağrısı var', async ({ page }) => {
    await openComposer(page, { auth: 'anonymous' });
    await expect(page.getByText(tr.composer.anon.post)).toBeVisible();
    await expect(editor(page)).toHaveCount(0);
  });
});
