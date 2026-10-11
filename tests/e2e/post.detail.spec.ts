import { expect, type Page, test } from './support/test';

import { scanSerious } from './helpers/axe';
import { editor, mockComposerApis, submitButton, tr, typeInEditor } from './helpers/composer';
import {
  loginViaUi,
  seedOnboardedUser,
  type TestAccount,
  uniqueSuffix,
  withDb,
} from './support/auth';

// S12: gönderi detayı + yorumlar. Gerçek Server Action'lar, gerçek DB + Auth emulator. Hisse
// indeksi (S7) composer için sözleşmeye göre route mock'u; sunucu cashtag'i kendi DB'sinden
// doğrular (bu yüzden THYAO E2E DB'sine de eklenir).

const ensureStock = (ticker: string, companyName: string): Promise<unknown> =>
  withDb(client =>
    client.query(
      `INSERT INTO "Stock" (ticker, "companyName", "stockType") VALUES ($1, $2, 'stock')
       ON CONFLICT (ticker) DO NOTHING`,
      [ticker, companyName]
    )
  );

const seedPost = (
  username: string,
  content: string,
  options: { deleted?: boolean } = {}
): Promise<number> =>
  withDb(async client => {
    const { rows } = await client.query<{ postId: number }>(
      `INSERT INTO "Post" ("userId", content, sentiment, "contentFormat", "deletedAt")
       SELECT "userId", $2, 'neutral', 2, $3 FROM "User" WHERE username = $1
       RETURNING "postId"`,
      [username, content, options.deleted ? new Date() : null]
    );
    const postId = rows[0]?.postId;
    if (postId === undefined) throw new Error('gönderi eklenemedi');
    return postId;
  });

const seedComment = (postId: number, username: string, content: string): Promise<unknown> =>
  withDb(client =>
    client.query(
      `INSERT INTO "Comment" ("postId", "userId", content, "contentFormat")
       SELECT $1, "userId", $3, 2 FROM "User" WHERE username = $2`,
      [postId, username, content]
    )
  );

const commentRowsOf = (postId: number) =>
  withDb(async client => {
    const { rows } = await client.query<{ content: string; deletedAt: Date | null }>(
      `SELECT content, "deletedAt" FROM "Comment" WHERE "postId" = $1 ORDER BY "commentId"`,
      [postId]
    );
    return rows;
  });

const openFromFeed = async (page: Page, text: string): Promise<void> => {
  const card = page.getByTestId('my-posts').getByTestId('post-card').filter({ hasText: text });
  // Gövdeye (etkileşimsiz alan) tıklama: kartın tamamı detaya götürür
  await card.locator('[data-slot="post-body"]').click();
};

let author: TestAccount;

test.beforeEach(async () => {
  await ensureStock('THYAO', 'Türk Hava Yolları A.O.');
  author = await seedOnboardedUser();
});

test.describe('gönderi detayı (S12)', () => {
  test('akıştan kartı aç → Geri → tekrar aç → yorum yaz ($THYAO) → görünür → beğen → sil', async ({
    page,
  }) => {
    const text = `Detay testi ${uniqueSuffix()}`;
    const postId = await seedPost(author.username, text);
    await mockComposerApis(page);
    await loginViaUi(page, author);
    await page.waitForURL('**/akis');

    await openFromFeed(page, text);
    await page.waitForURL(`**/gonderi/${postId}`);
    await expect(page.getByRole('heading', { level: 1, name: tr.postDetail.title })).toBeVisible();
    await expect(page.getByTestId('post-card')).toContainText(text);
    await expect(page.getByText(tr.comments.empty)).toBeVisible();

    // Uygulama içinden gelindi: "Geri" geçmişte geri gider (akış önbellekten, konum korunur)
    await page.getByTestId('post-detail-back').click();
    await page.waitForURL('**/akis');
    await openFromFeed(page, text);
    await page.waitForURL(`**/gonderi/${postId}`);

    await typeInEditor(page, '$THYAO için hedef ne? ', 'comment');
    await expect(page.getByText(tr.legal.disclaimer.comment)).toBeVisible();
    await submitButton(page).click();
    await expect(page.getByText(tr.composer.success.comment)).toBeVisible();
    await expect(editor(page, 'comment')).toHaveText('');

    const comment = page.getByTestId('comment-list').getByTestId('comment').first();
    await expect(comment).toContainText('için hedef ne?');
    await expect(comment.getByRole('link', { name: /\$THYAO/ })).toHaveAttribute(
      'href',
      '/hisse/THYAO'
    );
    // Gönderi kartındaki yorum sayacı sunucudan tazelenir
    await expect(page.getByTestId('post-card').getByText('1 yorum')).toBeAttached();

    // Composer odaktayken liste kayabilir: önce odağı dışarı al
    await page.getByRole('heading', { level: 1 }).click();
    const like = comment.getByTestId('post-like');
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await expect(like).not.toHaveAttribute('aria-busy');
    await page.reload();
    const reloaded = page.getByTestId('comment').first();
    await expect(reloaded.getByTestId('post-like')).toHaveAttribute('aria-pressed', 'true');
    await expect(reloaded.getByTestId('post-like-count')).toHaveText('1');

    await reloaded.getByRole('button', { name: tr.comments.actions.menu }).click();
    await page.getByRole('menuitem', { name: tr.comments.actions.delete }).click();
    const dialog = page.getByRole('dialog', { name: tr.comments.actions.deleteTitle });
    await dialog.getByTestId('comment-delete-confirm').click();
    await expect(page.getByText(tr.comments.actions.deleted)).toBeVisible();
    await expect(page.getByTestId('comment')).toHaveCount(0);
    await expect(page.getByText(tr.comments.empty)).toBeVisible();
    const rows = await commentRowsOf(postId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.content).toBe('$THYAO için hedef ne?');
    expect(rows[0]?.deletedAt).not.toBeNull();
  });

  test('anonim okur (metadata dahil); yorum için giriş çağrısı next ile geri getirir', async ({
    page,
  }) => {
    const text = `Anonim okunan gönderi ${uniqueSuffix()} <b>kalın değil</b>`;
    const postId = await seedPost(author.username, text);
    await seedComment(postId, author.username, 'yazarın kendi yorumu');

    const response = await page.goto(`/gonderi/${postId}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId('post-card')).toContainText(text);
    await expect(page.getByTestId('comment')).toContainText('yazarın kendi yorumu');
    await expect(page.getByTestId('post-like')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: tr.composer.label.comment })).toHaveCount(0);

    // Metadata: içerikten düz metin özet, indekslenebilir (robots noindex yok)
    await expect(page).toHaveTitle(new RegExp(`^${author.displayName}: “Anonim okunan gönderi`));
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', text);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

    await expect(page.getByText(tr.composer.anon.comment)).toBeVisible();
    await page.getByTestId('comments').getByRole('link', { name: tr.common.login }).click();
    await page.waitForURL(`**/giris?next=%2Fgonderi%2F${postId}`);

    const reader = await seedOnboardedUser();
    await page.getByLabel(tr.auth.fields.email).fill(reader.email);
    await page.getByLabel(tr.auth.fields.password).fill(reader.password);
    await page.getByTestId('auth-submit').click();
    await page.waitForURL(`**/gonderi/${postId}`);
    await expect(page.getByRole('textbox', { name: tr.composer.label.comment })).toBeVisible();
  });

  test('eski URL /posts/:id → 301 /gonderi/:id (tr ve en önekli biçimler dahil)', async ({
    page,
  }) => {
    for (const [legacy, target] of [
      ['/posts/123', '/gonderi/123'],
      ['/tr/posts/123', '/gonderi/123'],
      ['/en/posts/123', '/en/gonderi/123'],
    ] as const) {
      const response = await page.request.get(legacy, { maxRedirects: 0 });
      expect(response.status(), legacy).toBe(301);
      expect(new URL(response.headers()['location'] ?? '', 'http://x').pathname).toBe(target);
    }
  });

  test('silinmiş gönderi "kaldırıldı" (noindex); olmayan ve geçersiz kimlik 404', async ({
    page,
  }) => {
    const deletedId = await seedPost(author.username, 'silinecek gizli metin', { deleted: true });
    const response = await page.goto(`/gonderi/${deletedId}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId('post-detail-state')).toHaveAttribute('data-state', 'removed');
    await expect(page.getByText(tr.postDetail.removed)).toBeVisible();
    await expect(page.getByText('silinecek gizli metin')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page).toHaveTitle(new RegExp(`^${tr.postDetail.removedMetaTitle}`));

    for (const path of ['/gonderi/2000000000', '/gonderi/abc', '/gonderi/0123']) {
      const notFound = await page.goto(path);
      expect(notFound?.status(), path).toBe(404);
    }
  });

  test('erişilebilirlik (axe): anonim ve girişli detay, koyu ve açık tema', async ({ page }) => {
    const postId = await seedPost(author.username, `Erişilebilirlik ${uniqueSuffix()} $THYAO`);
    await seedComment(postId, author.username, 'erişilebilir yorum');
    for (const theme of ['dark', 'light'] as const) {
      await page.addInitScript(value => {
        window.localStorage.setItem('theme', value);
      }, theme);
      await page.goto(`/gonderi/${postId}`);
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
      await expect(page.getByTestId('comment')).toBeVisible();
      expect(await scanSerious(page)).toEqual([]);
    }
    await mockComposerApis(page);
    await loginViaUi(page, author);
    await page.waitForURL('**/akis');
    await page.goto(`/gonderi/${postId}`);
    await editor(page, 'comment').click();
    await expect(page.getByText(tr.legal.disclaimer.comment)).toBeVisible();
    expect(await scanSerious(page)).toEqual([]);
  });

  test(
    'mobil: yatay taşma yok, dokunma ile karttan detaya',
    { tag: '@mobile' },
    async ({ page }) => {
      const text = `Mobil detay ${uniqueSuffix()}`;
      const postId = await seedPost(author.username, text);
      await mockComposerApis(page);
      await loginViaUi(page, author);
      await page.waitForURL('**/akis');
      await page
        .getByTestId('my-posts')
        .getByTestId('post-card')
        .filter({ hasText: text })
        .locator('[data-slot="post-body"]')
        .tap();
      await page.waitForURL(`**/gonderi/${postId}`);
      await expect(editor(page, 'comment')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
  );
});
