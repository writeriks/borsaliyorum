import { expect, test } from './support/test';

import { editor, mockComposerApis, submitButton, tr, typeInEditor } from './helpers/composer';
import {
  createFirebaseAccount,
  loginViaUi,
  seedOnboardedUser,
  uniqueSuffix,
  withDb,
} from './support/auth';

// S10 (Server Actions): gerçek createPost / setPostLike / deletePost, gerçek DB + Auth emulator.
// Autocomplete uçları (S7) ayrı dalda: hisse indeksi sözleşmeye göre route mock'u; sunucu
// hisse doğrulamasını kendi DB'sinden yapar (bu yüzden THYAO E2E DB'sine de eklenir).

const ensureStock = (ticker: string, companyName: string): Promise<unknown> =>
  withDb(client =>
    client.query(
      `INSERT INTO "Stock" (ticker, "companyName", "stockType") VALUES ($1, $2, 'stock')
       ON CONFLICT (ticker) DO NOTHING`,
      [ticker, companyName]
    )
  );

const postRowsOf = (username: string) =>
  withDb(async client => {
    const { rows } = await client.query<{ postId: number; deletedAt: Date | null }>(
      `SELECT p."postId", p."deletedAt" FROM "Post" p JOIN "User" u ON u."userId" = p."userId"
       WHERE u.username = $1`,
      [username]
    );
    return rows;
  });

test.describe('gönderi yazma (S10)', () => {
  test('giriş → gönderi yaz ($THYAO #bist100 link) → kartta görünür → beğen → sil', async ({
    page,
  }) => {
    await ensureStock('THYAO', 'Türk Hava Yolları A.O.');
    const account = await seedOnboardedUser();
    await mockComposerApis(page);
    await loginViaUi(page, account);
    await page.waitForURL('**/akis');

    // .example ayrılmış alan adı: sunucunun after() önizleme çekimi dışarı çıkmadan başarısız olur
    const tag = `bist100`;
    await typeInEditor(
      page,
      `$THYAO #${tag} rekor kırdı https://haber.example/thy-${uniqueSuffix()} `
    );
    await submitButton(page).click();
    await expect(page.getByText(tr.composer.success.post)).toBeVisible();
    await expect(editor(page)).toHaveText('');

    const card = page.getByTestId('my-posts').getByTestId('post-card').first();
    await expect(card).toContainText('rekor kırdı');
    await expect(card.getByRole('link', { name: '$THYAO' })).toHaveAttribute(
      'href',
      '/hisse/THYAO'
    );
    await expect(card.getByRole('link', { name: `#${tag}` })).toHaveAttribute(
      'href',
      `/etiket/${tag}`
    );
    expect(await postRowsOf(account.username)).toHaveLength(1);

    // Composer başarıdan sonra odakta kalır; listeye basınca blur ile daralır ve kart kayar
    // (tıklama hedefi kaçar). Kullanıcı gibi önce odağı composer dışına alıp daralmasını bekle.
    await page.getByRole('heading', { level: 1 }).click();
    await expect(page.getByTestId('composer-submit')).toBeHidden();

    // Beğeni: optimistic, sayfa yenilemesinden sonra da kalıcı
    const like = card.getByTestId('post-like');
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await expect(card.getByTestId('post-like-count')).toHaveText('1');
    await expect(like).not.toHaveAttribute('aria-busy');
    await page.reload();
    const reloaded = page.getByTestId('my-posts').getByTestId('post-card').first();
    await expect(reloaded.getByTestId('post-like')).toHaveAttribute('aria-pressed', 'true');
    await expect(reloaded.getByTestId('post-like-count')).toHaveText('1');

    // Silme: sahibine menü → onay → kart listeden kalkar, satır soft delete
    await reloaded.getByRole('button', { name: tr.post.actions.menu }).click();
    await page.getByRole('menuitem', { name: tr.post.actions.delete }).click();
    const dialog = page.getByRole('dialog', { name: tr.post.actions.deleteTitle });
    await dialog.getByTestId('post-delete-confirm').click();
    await expect(page.getByText(tr.post.actions.deleted)).toBeVisible();
    await expect(page.getByTestId('my-posts')).toHaveCount(0);
    const rows = await postRowsOf(account.username);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deletedAt).not.toBeNull();
  });

  test('e-postası doğrulanmamış kullanıcı: uyarı bandı, paylaşım EMAIL_NOT_VERIFIED, kayıt yok', async ({
    page,
  }) => {
    const firebase = await createFirebaseAccount({ emailVerified: false });
    const username = `e2e_${uniqueSuffix()}`;
    await withDb(client =>
      client.query(
        `INSERT INTO "User" ("firebaseUserId", username, "displayName", email, "isEmailVerified",
           "onboardedAt", "noticeAcknowledgedAt", "ageConfirmedAt")
         VALUES ($1, $2, 'Doğrulanmamış Test', $3, false, now(), now(), now())`,
        [firebase.uid, username, firebase.email]
      )
    );
    await mockComposerApis(page);
    await loginViaUi(page, firebase);
    await page.waitForURL('**/akis');
    await expect(page.getByTestId('email-verification-notice')).toBeVisible();

    await typeInEditor(page, 'doğrulamadan yazmayı deniyorum');
    await submitButton(page).click();
    await expect(page.getByTestId('composer-error')).toHaveText(tr.errors.EMAIL_NOT_VERIFIED);
    // Taslak kaybolmaz; sunucuda satır yok
    await expect(editor(page)).toHaveText('doğrulamadan yazmayı deniyorum');
    expect(await postRowsOf(username)).toHaveLength(0);
  });
});
