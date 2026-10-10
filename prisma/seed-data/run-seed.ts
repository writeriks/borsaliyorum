import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { PrismaClient, Sentiment } from '@/generated/prisma/client';

import { parseStockCsv } from '../../scripts/sync-stocks.mjs';

/**
 * Sentetik geliştirme/preview verisi (ADR-0001 "Ortamlar"). Gerçek kişi, e-posta ya da prod
 * verisi içermez. Hisseler KAP CSV biçimindeki `stocks.csv`'den, sync script'inin
 * ayrıştırıcısıyla okunur. Tekrar çalıştırılabilir: var olan kayıtlar güncellenmez/çoğaltılmaz.
 */
const CRYPTO = [
  ['BTC', 'BITCOIN'],
  ['ETH', 'ETHEREUM'],
] as const;

const USERS = [
  { username: 'seed_ayse', displayName: 'Ayşe Yılmaz (örnek)' },
  { username: 'seed_mehmet', displayName: 'Mehmet Kaya (örnek)' },
  { username: 'seed_zeynep', displayName: 'Zeynep Çelik (örnek)' },
  { username: 'seed_can', displayName: 'Can Öztürk (örnek)' },
] as const;

const TAGS = [
  { tagName: '#bist100', slug: 'bist100' },
  { tagName: '#temettü', slug: 'temettu' },
  { tagName: '#halkaarz', slug: 'halkaarz' },
] as const;

type SeedPost = {
  id: string;
  author: (typeof USERS)[number]['username'];
  content: string;
  contentFormat: 1 | 2;
  sentiment: Sentiment;
  tickers: readonly string[];
  tags: readonly string[];
};

// Sabit clientRequestId'ler: tekrar çalıştırmada aynı gönderi yeniden oluşmaz
const POSTS: readonly SeedPost[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    author: 'seed_ayse',
    content: '$(THYAO) bilançosu açıklandı, #(bist100) için önemli bir hafta.',
    contentFormat: 1,
    sentiment: 'neutral',
    tickers: ['THYAO'],
    tags: ['bist100'],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    author: 'seed_mehmet',
    content: '$ASELS ve $SISE için #temettü takvimini paylaşan var mı? @seed_ayse',
    contentFormat: 2,
    sentiment: 'neutral',
    tickers: ['ASELS', 'SISE'],
    tags: ['temettu'],
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    author: 'seed_zeynep',
    content: 'Bu hafta #halkaarz takvimi yoğun. Yatırım tavsiyesi değildir.',
    contentFormat: 2,
    sentiment: 'bearish',
    tickers: [],
    tags: ['halkaarz'],
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    author: 'seed_can',
    content: '$BTC hafta sonu yatay. https://example.com/analiz',
    contentFormat: 2,
    sentiment: 'bullish',
    tickers: ['BTC'],
    tags: [],
  },
];

export type SeedSummary = { stocks: number; users: number; tags: number; posts: number };

export const runSeed = async (prisma: PrismaClient): Promise<SeedSummary> => {
  const csv = readFileSync(fileURLToPath(new URL('./stocks.csv', import.meta.url)), 'utf8');
  const { stocks } = parseStockCsv(csv);

  await prisma.stock.createMany({
    data: [
      ...[...stocks].map(([ticker, companyName]) => ({
        ticker,
        companyName,
        stockType: 'stock' as const,
      })),
      ...CRYPTO.map(([ticker, companyName]) => ({
        ticker,
        companyName,
        stockType: 'crypto' as const,
      })),
    ],
    skipDuplicates: true,
  });

  const users = new Map<string, number>();
  for (const [index, user] of USERS.entries()) {
    const row = await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        ...user,
        firebaseUserId: `seed-uid-${index + 1}`,
        email: `${user.username}@example.test`,
        isEmailVerified: true,
        onboardedAt: new Date(),
        noticeVersion: 'seed',
        ageConfirmedAt: new Date(),
      },
    });
    users.set(user.username, row.userId);
  }

  const tags = new Map<string, number>();
  for (const tag of TAGS) {
    const row = await prisma.tag.upsert({ where: { slug: tag.slug }, update: {}, create: tag });
    tags.set(tag.slug, row.tagId);
  }

  const stockIds = new Map(
    (await prisma.stock.findMany({ select: { ticker: true, stockId: true } })).map(s => [
      s.ticker,
      s.stockId,
    ])
  );
  const idOf = (map: ReadonlyMap<string, number>, key: string): number => {
    const id = map.get(key);
    if (id === undefined) throw new Error(`Seed referansı bulunamadı: ${key}`);
    return id;
  };

  for (const post of POSTS) {
    const userId = idOf(users, post.author);
    await prisma.post.upsert({
      where: { clientRequestId: post.id },
      update: {},
      create: {
        clientRequestId: post.id,
        userId,
        content: post.content,
        contentFormat: post.contentFormat,
        sentiment: post.sentiment,
        stocks: { create: post.tickers.map(ticker => ({ stockId: idOf(stockIds, ticker) })) },
        tags: { create: post.tags.map(slug => ({ tagId: idOf(tags, slug) })) },
      },
    });
  }

  const [ayse, mehmet, zeynep] = USERS.map(user => idOf(users, user.username));
  if (ayse !== undefined && mehmet !== undefined && zeynep !== undefined) {
    await prisma.userFollow.createMany({
      data: [
        { followerId: ayse, followingId: mehmet },
        { followerId: mehmet, followingId: ayse },
        { followerId: zeynep, followingId: ayse },
      ],
      skipDuplicates: true,
    });
    await prisma.stockFollow.createMany({
      data: [
        { userId: ayse, stockId: idOf(stockIds, 'THYAO') },
        { userId: mehmet, stockId: idOf(stockIds, 'ASELS') },
      ],
      skipDuplicates: true,
    });
  }

  return {
    stocks: stockIds.size,
    users: users.size,
    tags: tags.size,
    posts: POSTS.length,
  };
};
