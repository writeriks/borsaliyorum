import { editor, mockComposerApis, submitButton, tr, typeInEditor } from './helpers/composer';
import {
  loginViaUi,
  seedOnboardedUser,
  type TestAccount,
  uniqueSuffix,
  withDb,
} from './support/auth';
import { expect, type Page, test } from './support/test';

// S11 akış: gerçek DB + Auth emulator. Veri doğrudan SQL ile tohumlanır; E2E DB'si paylaşımlı
// olduğundan beklentiler yalnızca bu testin kullanıcılarına bağlıdır.

const userIdOf = (username: string): Promise<number> =>
  withDb(async client => {
    const { rows } = await client.query<{ userId: number }>(
      'SELECT "userId" FROM "User" WHERE username = $1',
      [username]
    );
    const id = rows[0]?.userId;
    if (id === undefined) throw new Error(`kullanıcı yok: ${username}`);
    return id;
  });

const follow = (followerId: number, followingId: number): Promise<unknown> =>
  withDb(client =>
    client.query('INSERT INTO "UserFollowers" ("followerId", "followingId") VALUES ($1, $2)', [
      followerId,
      followingId,
    ])
  );

/** `count` gönderi; i. gönderi `minutesAgo + i` dakika önce. Dönüş: yeniden eskiye postId'ler. */
const seedPosts = (
  userId: number,
  count: number,
  label: string,
  minutesAgo = 1
): Promise<number[]> =>
  withDb(async client => {
    const ids: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const { rows } = await client.query<{ postId: number }>(
        `INSERT INTO "Post" (content, sentiment, "contentFormat", "userId", "createdAt")
         VALUES ($1, 'neutral', 2, $2, now() - make_interval(mins => $3)) RETURNING "postId"`,
        [`${label} ${i}`, userId, minutesAgo + i]
      );
      ids.push(rows[0]?.postId ?? 0);
    }
    return ids;
  });

const like = (userId: number, postId: number): Promise<unknown> =>
  withDb(client =>
    client.query('INSERT INTO "PostLikes" ("userId", "postId") VALUES ($1, $2)', [userId, postId])
  );

const cardPostIds = (page: Page): Promise<string[]> =>
  page
    .getByTestId('feed-list')
    .getByTestId('post-card')
    .evaluateAll(cards => cards.map(card => card.getAttribute('data-post-id') ?? ''));

const login = async (page: Page, account: TestAccount): Promise<void> => {
  await loginViaUi(page, account);
  await page.waitForURL('**/akis');
};

test.describe('akış (S11)', () => {
  test('takip edilen kullanıcının gönderileri: SSR ilk 20, kaydırınca kalanlar, tekrar yok; kapsam dışı yok', async ({
    page,
  }) => {
    const viewer = await seedOnboardedUser();
    const author = await seedOnboardedUser();
    const stranger = await seedOnboardedUser();
    const [viewerId, authorId, strangerId] = await Promise.all(
      [viewer, author, stranger].map(account => userIdOf(account.username))
    );
    await follow(viewerId ?? 0, authorId ?? 0);
    const label = `akis-${uniqueSuffix()}`;
    const expected = await seedPosts(authorId ?? 0, 25, label);
    await seedPosts(strangerId ?? 0, 1, `yabanci-${label}`, 0);

    await login(page, viewer);
    const feed = page.getByRole('feed', { name: tr.feed.title });
    await expect(feed.getByTestId('post-card')).toHaveCount(20);
    expect(await cardPostIds(page)).toEqual(expected.slice(0, 20).map(String));

    // Sonsuz kaydırma: sentinel görünür olunca sonraki sayfa
    await page.getByTestId('feed-sentinel').scrollIntoViewIfNeeded();
    await expect(feed.getByTestId('post-card')).toHaveCount(25);
    expect(await cardPostIds(page)).toEqual(expected.map(String));
    await expect(page.getByTestId('feed-end')).toHaveText(tr.feed.end);
    await expect(page.getByTestId('feed-load-more')).toHaveCount(0);
    await expect(feed).not.toContainText(`yabanci-${label}`);
  });

  test('Popüler: URL ?sekme=populer, aktif sekme; beğenisi çok olan önce', async ({ page }) => {
    const viewer = await seedOnboardedUser();
    const author = await seedOnboardedUser();
    const likers = await Promise.all([seedOnboardedUser(), seedOnboardedUser()]);
    const [viewerId, authorId, ...likerIds] = await Promise.all(
      [viewer, author, ...likers].map(account => userIdOf(account.username))
    );
    await follow(viewerId ?? 0, authorId ?? 0);
    const [newer, older] = await seedPosts(authorId ?? 0, 2, `populer-${uniqueSuffix()}`);
    for (const likerId of likerIds) await like(likerId ?? 0, older ?? 0);

    await login(page, viewer);
    expect(await cardPostIds(page)).toEqual([String(newer), String(older)]);

    const tabs = page.getByRole('navigation', { name: tr.feed.tabs.label });
    await tabs.getByRole('link', { name: tr.feed.tabs.popular }).click();
    await page.waitForURL('**/akis?sekme=populer');
    await expect(tabs.getByRole('link', { name: tr.feed.tabs.popular })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expect(page.getByTestId('feed-list')).toHaveAttribute('data-tab', 'popular');
    expect(await cardPostIds(page)).toEqual([String(older), String(newer)]);
  });

  test('kimseyi takip etmeyen yeni kullanıcı: boş durum + keşfet önerisi', async ({ page }) => {
    const other = await seedOnboardedUser();
    await seedPosts(await userIdOf(other.username), 1, `kesfet-${uniqueSuffix()}`, 0);
    const viewer = await seedOnboardedUser();
    await login(page, viewer);

    const empty = page.getByTestId('feed-empty');
    await expect(empty).toHaveAttribute('data-reason', 'no-follows');
    await expect(empty).toContainText(tr.feed.empty.noFollows);
    await expect(
      page.getByRole('region', { name: tr.feed.empty.discoverTitle }).getByTestId('post-card')
    ).not.toHaveCount(0);
    await expect(page.getByRole('feed')).toHaveCount(0);
  });

  test(
    'sağ kolon (xl): gündem başlığı ölçütüyle, takip edilen hisse linki',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      const viewer = await seedOnboardedUser();
      const ticker = `F${uniqueSuffix().slice(0, 4).toUpperCase()}`;
      await withDb(async client => {
        const { rows } = await client.query<{ stockId: number }>(
          `INSERT INTO "Stock" (ticker, "companyName", "stockType") VALUES ($1, 'AKIŞ E2E A.Ş.', 'stock')
         RETURNING "stockId"`,
          [ticker]
        );
        await client.query('INSERT INTO "StockFollowers" ("userId", "stockId") VALUES ($1, $2)', [
          await userIdOf(viewer.username),
          rows[0]?.stockId,
        ]);
      });
      await login(page, viewer);

      const aside = page.getByRole('complementary', { name: tr.shell.aside });
      await expect(aside.getByRole('heading', { name: tr.feed.aside.trendingTitle })).toBeVisible();
      const followed = aside.getByRole('region', { name: tr.feed.aside.followedStocksTitle });
      await expect(
        followed.getByRole('link', { name: new RegExp(`\\$${ticker}`) })
      ).toHaveAttribute('href', `/hisse/${ticker}`);
    }
  );

  test('akışı dolu kullanıcı: /akis → "Gönderi" (istemci gezinmesi) → sheet → paylaş → yeni gönderi en üstte', async ({
    page,
  }) => {
    // FeedList'in mount olup önbelleği doldurması için akışta gönderi olmalı (remount hatası)
    const viewer = await seedOnboardedUser();
    const label = `mevcut-${uniqueSuffix()}`;
    await seedPosts(await userIdOf(viewer.username), 1, label);
    await mockComposerApis(page);
    await login(page, viewer);
    const cards = page.getByTestId('feed-list').getByTestId('post-card');
    await expect(cards.first()).toContainText(label);

    // Mobil: alt tab bar; masaüstü: sol menü. İkisi de istemci tarafı link
    await page.locator('a[href="/paylas"]').filter({ visible: true }).first().click();
    await page.waitForURL('**/paylas');
    await expect(editor(page)).toBeFocused();

    const text = `sheetten paylaşım ${uniqueSuffix()}`;
    await typeInEditor(page, text);
    await submitButton(page).click();
    await page.waitForURL('**/akis');
    await expect(cards.first()).toContainText(text);
    await expect(cards.nth(1)).toContainText(label);

    // Paylaşım replace ile: geri tuşu boş sheet'e dönmez
    await page.goBack();
    await expect(page).not.toHaveURL(/\/paylas$/);
  });
});
