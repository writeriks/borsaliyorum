import { editorText, listbox, stocksListbox, tr, typeInEditor } from './helpers/composer';
import { accountMenu, loginViaUi, seedOnboardedUser, uniqueSuffix, withDb } from './support/auth';
import { E2E_STOCKS_REVALIDATE_SECRET } from './support/env';
import { expect, test } from './support/test';

// S7: composer, route mock'u OLMADAN gerçek autocomplete uçlarıyla (`services=http`) ve gerçek
// oturumla. Veri E2E veritabanına seed edilir; testler paralel koştuğu için yalnızca kendi
// verisini assert eder (THYAO / bist100 idempotent eklenir).

const COMPOSER = '/dev/composer?services=http&auth=session';

const seedAutocompleteData = async (
  viewerUsername: string
): Promise<{ mentionUsername: string }> => {
  const mentionUsername = `ali_${uniqueSuffix()}`;
  await withDb(async client => {
    await client.query(
      `INSERT INTO "Stock" (ticker, "companyName", "stockType")
       VALUES ('THYAO', 'TÜRK HAVA YOLLARI A.O.', 'stock') ON CONFLICT DO NOTHING`
    );
    await client.query(
      `INSERT INTO "Tag" ("tagName", slug) VALUES ('#bist100', 'bist100') ON CONFLICT DO NOTHING`
    );
    await client.query(
      `INSERT INTO "User" ("firebaseUserId", username, "displayName", email, "isEmailVerified",
         "onboardedAt")
       VALUES ($1, $2, 'Ali Örnek', $3, true, now())`,
      [`uid-${mentionUsername}`, mentionUsername, `${mentionUsername}@example.test`]
    );
    // Takip edilen önek eşleşmesi ilk sırada: paralel testlerin `ali_*` kullanıcıları araya girmez
    await client.query(
      `INSERT INTO "UserFollowers" ("followerId", "followingId")
       SELECT v."userId", t."userId" FROM "User" v, "User" t
       WHERE v.username = $1 AND t.username = $2`,
      [viewerUsername, mentionUsername]
    );
  });
  return { mentionUsername };
};

test.describe('composer + gerçek autocomplete uçları', () => {
  test('$thy → THYAO, #bist → bist100, @ali → seed kullanıcısı', async ({ page, request }) => {
    const account = await seedOnboardedUser();
    const { mentionUsername } = await seedAutocompleteData(account.username);
    // Hisse indeksi 24 saat önbellekli: sync sonrası gibi geçersiz kıl (uç da E2E'de test edilir)
    const revalidate = await request.post('/api/revalidate/stocks', {
      headers: { authorization: `Bearer ${E2E_STOCKS_REVALIDATE_SECRET}` },
    });
    expect(revalidate.status()).toBe(200);

    await loginViaUi(page, account);
    await page.waitForURL('**/akis');
    await page.goto(COMPOSER);
    await expect(accountMenu(page)).toBeVisible();

    await typeInEditor(page, '$thy');
    const stock = stocksListbox(page).getByRole('option').first();
    await expect(stock).toHaveAccessibleName(/^THYAO,/);
    await page.keyboard.press('Enter');
    expect(await editorText(page)).toBe('$THYAO ');

    await page.keyboard.type('#bist');
    const tag = listbox(page, tr.ac.listbox.tags).getByRole('option', { name: /^#bist100,/ });
    await expect(tag).toBeVisible();
    await tag.click();
    expect(await editorText(page)).toBe('$THYAO #bist100 ');

    await page.keyboard.type('@ali');
    const user = listbox(page, tr.ac.listbox.users).getByRole('option').first();
    await expect(user).toContainText(`@${mentionUsername}`);
    await page.keyboard.press('Enter');
    expect(await editorText(page)).toBe(`$THYAO #bist100 @${mentionUsername} `);
  });

  test('uç sözleşmesi: anonim 401, hisse indeksi herkese açık ve CDN önbellekli', async ({
    request,
  }) => {
    for (const path of [
      '/api/autocomplete/users?q=ali',
      '/api/autocomplete/tags?q=bist',
      '/api/autocomplete/stocks/default',
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(401);
      expect(response.headers()['cache-control']).toBe('no-store');
    }
    const stocks = await request.get('/api/autocomplete/stocks');
    expect(stocks.status()).toBe(200);
    expect(stocks.headers()['cache-control']).toMatch(/^public, .*s-maxage=86400/);
    expect(Array.isArray(await stocks.json())).toBe(true);

    const wrongSecret = await request.post('/api/revalidate/stocks', {
      headers: { authorization: 'Bearer yanlis' },
    });
    expect(wrongSecret.status()).toBe(401);
  });
});
