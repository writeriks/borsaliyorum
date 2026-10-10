import type { Client } from 'pg';

/**
 * Eski uygulama (v1, Prisma 5) uyumluluğu — ADR-0003 "Migration testleri".
 *
 * v2 migration'larından sonra eski uygulamanın yaptığı INSERT'ler (yalnızca v1 şemasındaki
 * kolonlarla) başarılı olmalı ve yeni kolonlar DEFAULT'larını almalı. Ifadeler v1'in
 * `legacy/src` altındaki Prisma çağrılarının ürettiği kolon kümeleriyle aynıdır.
 *
 * Bir transaction içinde çalışır ve her zaman ROLLBACK eder. Dönüş: hata mesajları (boş = OK).
 */
export const checkLegacyCompatibility = async (client: Client): Promise<string[]> => {
  const failures: string[] = [];
  const expectEqual = (label: string, actual: unknown, expected: unknown): void => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(
        `${label}: beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`
      );
    }
  };

  await client.query('BEGIN');
  try {
    const user = await client.query<{ userId: number; status: string; onboardedAt: Date | null }>(
      `INSERT INTO "User" ("firebaseUserId", "username", "displayName", "email", "createdAt", "isEmailVerified")
       VALUES ('legacy-uid', 'legacy@example.test', 'Legacy', 'legacy@example.test', now(), false)
       RETURNING "userId", "status", "onboardedAt"`
    );
    const userRow = user.rows[0];
    if (!userRow) throw new Error('User INSERT satır döndürmedi');
    expectEqual('User.status DEFAULT', userRow.status, 'active');
    expectEqual('User.onboardedAt', userRow.onboardedAt, null);

    await client.query(`INSERT INTO "SecurityRole" ("role", "userId") VALUES ('default', $1)`, [
      userRow.userId,
    ]);

    const stock = await client.query<{ stockId: number }>(
      `INSERT INTO "Stock" ("ticker", "companyName", "stockType") VALUES ('LGCY1', 'LEGACY A.Ş.', 'stock')
       RETURNING "stockId"`
    );
    const post = await client.query<{
      postId: number;
      contentFormat: number;
      isSponsored: boolean;
      entities: unknown;
      deletedAt: Date | null;
    }>(
      `INSERT INTO "Post" ("userId", "content", "sentiment", "createdAt", "updatedAt")
       VALUES ($1, '$(LGCY1) #(bist100) @(legacy) eski format', 'bullish', now(), now())
       RETURNING "postId", "contentFormat", "isSponsored", "entities", "deletedAt"`,
      [userRow.userId]
    );
    const postRow = post.rows[0];
    if (!postRow) throw new Error('Post INSERT satır döndürmedi');
    expectEqual('Post.contentFormat DEFAULT', postRow.contentFormat, 1);
    expectEqual('Post.isSponsored DEFAULT', postRow.isSponsored, false);
    expectEqual('Post.entities', postRow.entities, null);
    expectEqual('Post.deletedAt', postRow.deletedAt, null);

    const tag = await client.query<{ tagId: number; slug: string | null }>(
      `INSERT INTO "Tag" ("tagName", "createdAt", "updatedAt") VALUES ('#legacytag', now(), now())
       RETURNING "tagId", "slug"`
    );
    const tagRow = tag.rows[0];
    if (!tagRow) throw new Error('Tag INSERT satır döndürmedi');
    expectEqual('Tag.slug (eski uygulama yazmaz)', tagRow.slug, null);

    await client.query(`INSERT INTO "_PostStocks" ("A", "B") VALUES ($1, $2)`, [
      postRow.postId,
      stock.rows[0]?.stockId,
    ]);
    await client.query(`INSERT INTO "_PostTags" ("A", "B") VALUES ($1, $2)`, [
      postRow.postId,
      tagRow.tagId,
    ]);

    const comment = await client.query<{
      commentId: number;
      contentFormat: number;
      deletedAt: Date | null;
    }>(
      `INSERT INTO "Comment" ("postId", "userId", "content", "createdAt", "updatedAt")
       VALUES ($1, $2, 'eski yorum', now(), now())
       RETURNING "commentId", "contentFormat", "deletedAt"`,
      [postRow.postId, userRow.userId]
    );
    const commentRow = comment.rows[0];
    if (!commentRow) throw new Error('Comment INSERT satır döndürmedi');
    expectEqual('Comment.contentFormat DEFAULT', commentRow.contentFormat, 1);
    expectEqual('Comment.deletedAt', commentRow.deletedAt, null);

    await client.query(`INSERT INTO "PostLikes" ("userId", "postId") VALUES ($1, $2)`, [
      userRow.userId,
      postRow.postId,
    ]);
    await client.query(
      `INSERT INTO "Notification" ("userId", "fromUserId", "type", "content", "updatedAt", "postId", "commentId")
       VALUES ($1, $1, 'COMMENT', 'yorum', now(), $2, $3)`,
      [userRow.userId, postRow.postId, commentRow.commentId]
    );
  } catch (error) {
    failures.push(`Eski uygulama INSERT'i başarısız: ${(error as Error).message}`);
  } finally {
    await client.query('ROLLBACK');
  }
  return failures;
};
