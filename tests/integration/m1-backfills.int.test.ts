import type { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  applyMigrationFiles,
  dropDatabase,
  listMigrationNames,
  recreateDatabase,
  withClient,
} from '@tests/db/admin';
import { databaseUrl } from '@tests/db/config';
import { workerDatabaseName } from '@tests/db/worker';

/**
 * M1 veri migration'ları (Tag.slug backfill + birleştirme, User.onboardedAt backfill) gerçek
 * migration SQL'i ile, backfill'den ÖNCEKİ şemaya eski uygulama verisi konarak test edilir.
 */
const TAG_BACKFILL = '20261010120500_m1_tag_slug_backfill';
const ONBOARDED_BACKFILL = '20261010120600_m1_user_onboarded_backfill';

const dbName = `${workerDatabaseName()}_backfill`;
const url = databaseUrl(dbName);

const insertTag = async (client: Client, tagName: string, createdAt: string): Promise<number> => {
  const { rows } = await client.query<{ tagId: number }>(
    `INSERT INTO "Tag" ("tagName", "createdAt", "updatedAt") VALUES ($1, $2, $2) RETURNING "tagId"`,
    [tagName, createdAt]
  );
  const tagId = rows[0]?.tagId;
  if (tagId === undefined) throw new Error('tag insert failed');
  return tagId;
};

const insertUser = async (client: Client, username: string, createdAt: string): Promise<number> => {
  const { rows } = await client.query<{ userId: number }>(
    `INSERT INTO "User" ("firebaseUserId", "username", "displayName", "email", "createdAt", "isEmailVerified")
     VALUES ($1, $1, $1, $1 || '@example.test', $2, true) RETURNING "userId"`,
    [username, createdAt]
  );
  const userId = rows[0]?.userId;
  if (userId === undefined) throw new Error('user insert failed');
  return userId;
};

const insertPost = async (client: Client, userId: number, tagIds: number[]): Promise<number> => {
  const { rows } = await client.query<{ postId: number }>(
    `INSERT INTO "Post" ("userId", "content", "sentiment") VALUES ($1, 'x', 'neutral') RETURNING "postId"`,
    [userId]
  );
  const postId = rows[0]?.postId;
  if (postId === undefined) throw new Error('post insert failed');
  for (const tagId of tagIds) {
    await client.query(`INSERT INTO "_PostTags" ("A", "B") VALUES ($1, $2)`, [postId, tagId]);
  }
  return postId;
};

type Fixture = {
  tags: Record<
    | 'upper'
    | 'lower'
    | 'dotted'
    | 'dotless'
    | 'seker'
    | 'Seker'
    | 'long'
    | 'kar'
    | 'kAr'
    | 'homograph',
    number
  >;
  posts: Record<'p1' | 'p2' | 'p3' | 'p4', number>;
  users: Record<'valid' | 'email' | 'upper' | 'reserved', number>;
};

let fixture: Fixture;

beforeAll(async () => {
  await recreateDatabase(dbName);
  const all = await listMigrationNames();
  const before = all.filter(name => name < TAG_BACKFILL);
  await applyMigrationFiles(url, before);

  fixture = await withClient(url, async client => {
    const users = {
      valid: await insertUser(client, 'ali_veli', '2025-01-01T10:00:00Z'),
      email: await insertUser(client, 'ayse@gmail.com', '2025-01-02T10:00:00Z'),
      upper: await insertUser(client, 'Mehmet', '2025-01-03T10:00:00Z'),
      // Kurala uyar ama rezerve: yeniden ad seçmeye zorlanmalı
      reserved: await insertUser(client, 'spk', '2025-01-04T10:00:00Z'),
    };
    const tags = {
      upper: await insertTag(client, '#BIST100', '2025-02-01T00:00:00Z'),
      lower: await insertTag(client, '#bist100', '2025-03-01T00:00:00Z'),
      dotted: await insertTag(client, '#BİST100', '2025-04-01T00:00:00Z'),
      dotless: await insertTag(client, '#bıst100', '2025-05-01T00:00:00Z'),
      seker: await insertTag(client, '#şeker', '2025-02-01T00:00:00Z'),
      Seker: await insertTag(client, '#Şeker', '2025-01-15T00:00:00Z'),
      long: await insertTag(client, `#${'a'.repeat(70)}`, '2025-01-01T00:00:00Z'),
      kar: await insertTag(client, '#kar', '2025-06-01T00:00:00Z'),
      kAr: await insertTag(client, '#KÂR', '2025-05-01T00:00:00Z'),
      homograph: await insertTag(client, '#ВIST100', '2025-01-01T00:00:00Z'),
    };
    const posts = {
      p1: await insertPost(client, users.valid, [tags.upper]),
      p2: await insertPost(client, users.valid, [tags.lower]),
      // Aynı gönderide iki çift: birleştirmede tek satıra inmeli
      p3: await insertPost(client, users.email, [tags.upper, tags.dotted, tags.seker]),
      p4: await insertPost(client, users.upper, [tags.dotless, tags.long, tags.Seker]),
    };
    return { tags, posts, users };
  });

  await applyMigrationFiles(url, [TAG_BACKFILL, ONBOARDED_BACKFILL]);
});

afterAll(async () => {
  await dropDatabase(dbName);
});

const query = async <T extends object>(sql: string, params: unknown[] = []): Promise<T[]> =>
  withClient(url, async client => (await client.query<T>(sql, params)).rows);

describe('Tag.slug backfill', () => {
  it('merges BIST100 / bist100 / BİST100 / bıst100 into the oldest tag', async () => {
    const rows = await query<{ tagId: number; tagName: string; updatedAt: Date }>(
      `SELECT "tagId", "tagName", "updatedAt" FROM "Tag" WHERE slug = 'bist100'`
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.tagId).toBe(fixture.tags.upper);
    expect(rows[0]?.tagName).toBe('#BIST100');
    // Son kullanım grubun en yenisi (bıst100: 2025-05-01)
    expect(rows[0]?.updatedAt.toISOString()).toBe('2025-05-01T00:00:00.000Z');

    const leftovers = await query(`SELECT 1 FROM "Tag" WHERE "tagId" = ANY($1)`, [
      [fixture.tags.lower, fixture.tags.dotted, fixture.tags.dotless],
    ]);
    expect(leftovers).toEqual([]);
  });

  it('keeps every post association without duplicates', async () => {
    const rows = await query<{ A: number; B: number }>(
      `SELECT "A", "B" FROM "_PostTags" ORDER BY "A", "B"`
    );
    const { p1, p2, p3, p4 } = fixture.posts;
    const { upper, Seker, long } = fixture.tags;

    expect(rows).toEqual(
      [
        { A: p1, B: upper },
        { A: p2, B: upper },
        { A: p3, B: upper },
        { A: p3, B: Seker },
        { A: p4, B: upper },
        { A: p4, B: long },
        { A: p4, B: Seker },
      ].sort((a, b) => a.A - b.A || a.B - b.B)
    );
  });

  it('folds Turkish letters (şeker / Şeker → seker, oldest wins)', async () => {
    const rows = await query<{ tagId: number }>(`SELECT "tagId" FROM "Tag" WHERE slug = 'seker'`);
    expect(rows).toEqual([{ tagId: fixture.tags.Seker }]);
  });

  it('leaves tags that cannot be v2 hashtags without a slug', async () => {
    const rows = await query<{ slug: string | null }>(
      `SELECT slug FROM "Tag" WHERE "tagId" = ANY($1)`,
      [[fixture.tags.long, fixture.tags.homograph]]
    );
    expect(rows).toEqual([{ slug: null }, { slug: null }]);
  });

  it('folds circumflex letters like the TS foldTag (#KÂR = #kar, oldest wins)', async () => {
    const rows = await query<{ tagId: number }>(`SELECT "tagId" FROM "Tag" WHERE slug = 'kar'`);
    expect(rows).toEqual([{ tagId: fixture.tags.kAr }]);
  });

  it('fold_tag matches ADR-0002 foldTag examples', async () => {
    const rows = await query<{ a: string; b: string; c: string; d: string }>(
      `SELECT fold_tag('BIST100') a, fold_tag('BİST100') b, fold_tag('IĞDIR') c, fold_tag('ÇÖĞÜŞ') d`
    );
    expect(rows).toEqual([{ a: 'bist100', b: 'bist100', c: 'igdir', d: 'cogus' }]);
  });
});

describe('User.onboardedAt backfill', () => {
  it('marks only non-reserved usernames matching the v2 rule as onboarded', async () => {
    const rows = await query<{ userId: number; onboarded: boolean }>(
      `SELECT "userId", "onboardedAt" = "createdAt" AS onboarded FROM "User" ORDER BY "userId"`
    );
    const nulls = await query<{ userId: number }>(
      `SELECT "userId" FROM "User" WHERE "onboardedAt" IS NULL ORDER BY "userId"`
    );

    expect(rows.find(r => r.userId === fixture.users.valid)?.onboarded).toBe(true);
    expect(nulls.map(r => r.userId)).toEqual([
      fixture.users.email,
      fixture.users.upper,
      fixture.users.reserved,
    ]);
  });
});

describe('remaining M1 migrations after backfill', () => {
  it('creates the unique slug index over the merged data', async () => {
    const all = await listMigrationNames();
    await applyMigrationFiles(
      url,
      all.filter(name => name > ONBOARDED_BACKFILL)
    );

    const rows = await query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'Tag' AND indexname = 'Tag_slug_key'`
    );
    expect(rows).toEqual([{ indexname: 'Tag_slug_key' }]);
  });
});
