import { randomUUID } from 'node:crypto';

import type {
  Comment,
  Post,
  PostLike,
  Prisma,
  Stock,
  StockFollow,
  Tag,
  User,
  UserBlock,
  UserFollow,
} from '@/generated/prisma/client';
import { getDb } from '@/lib/db';

/**
 * Integration test verisi (ADR-0003). Her factory geçerli, birbirinden bağımsız bir satır
 * üretir; benzersiz alanlar sayaçla türetilir. Yalnızca test ettiğin alanı override et.
 * Veriler tamamen sentetiktir (gerçek kişi/e-posta yok).
 */
let sequence = 0;
const next = (): number => {
  sequence += 1;
  return sequence;
};

export const createUser = async (
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {}
): Promise<User> => {
  const n = next();
  return getDb().user.create({
    data: {
      firebaseUserId: `test-uid-${n}-${randomUUID()}`,
      username: `user_${n}`,
      displayName: `Test Kullanıcı ${n}`,
      email: `user${n}@example.test`,
      isEmailVerified: true,
      onboardedAt: new Date(),
      ...overrides,
    },
  });
};

export const createStock = async (
  overrides: Partial<Prisma.StockUncheckedCreateInput> = {}
): Promise<Stock> => {
  const n = next();
  return getDb().stock.create({
    data: {
      ticker: `T${String(n).padStart(4, '0')}`,
      companyName: `TEST ŞİRKETİ ${n} A.Ş.`,
      stockType: 'stock',
      ...overrides,
    },
  });
};

export const createTag = async (
  overrides: Partial<Prisma.TagUncheckedCreateInput> = {}
): Promise<Tag> => {
  const n = next();
  return getDb().tag.create({
    data: { tagName: `#etiket${n}`, slug: `etiket${n}`, ...overrides },
  });
};

type CreatePostInput = Partial<Prisma.PostUncheckedCreateInput> & {
  stockIds?: readonly number[];
  tagIds?: readonly number[];
};

/** `userId` verilmezse yeni bir kullanıcı oluşturur. Varsayılan v2 düz metin formatı. */
export const createPost = async ({
  stockIds = [],
  tagIds = [],
  ...overrides
}: CreatePostInput = {}): Promise<Post> => {
  const userId = overrides.userId ?? (await createUser()).userId;
  return getDb().post.create({
    data: {
      content: `Test gönderisi ${next()}`,
      sentiment: 'neutral',
      contentFormat: 2,
      ...overrides,
      userId,
      stocks: { create: stockIds.map(stockId => ({ stockId })) },
      tags: { create: tagIds.map(tagId => ({ tagId })) },
    },
  });
};

export const createComment = async (
  overrides: Partial<Prisma.CommentUncheckedCreateInput> = {}
): Promise<Comment> => {
  const postId = overrides.postId ?? (await createPost()).postId;
  const userId = overrides.userId ?? (await createUser()).userId;
  return getDb().comment.create({
    data: { content: `Test yorumu ${next()}`, contentFormat: 2, ...overrides, postId, userId },
  });
};

export const followUser = async (followerId: number, followingId: number): Promise<UserFollow> =>
  getDb().userFollow.create({ data: { followerId, followingId } });

export const followStock = async (userId: number, stockId: number): Promise<StockFollow> =>
  getDb().stockFollow.create({ data: { userId, stockId } });

export const blockUser = async (blockerId: number, blockedId: number): Promise<UserBlock> =>
  getDb().userBlock.create({ data: { blockerId, blockedId } });

export const likePost = async (userId: number, postId: number): Promise<PostLike> =>
  getDb().postLike.create({ data: { userId, postId } });
