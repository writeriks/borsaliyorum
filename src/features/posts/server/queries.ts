import 'server-only';

import { cache } from 'react';

import type { PrismaClient } from '@/generated/prisma/client';
import { getCurrentUser } from '@/lib/auth/session';
import { collectRenderRefs, loadMentionUsers } from '@/lib/content/render-refs';
import { getDb } from '@/lib/db';

import { postIdSchema } from '../schemas';
import type { PostDetail } from '../types';

import { postCardSelect, toPostCardData } from './post-card-select';

/** Detayı okuyan: girişli kullanıcı ya da anonim (`null`). Yalnızca iç kimlik gerekir. */
export type DetailViewer = { readonly userId: number } | null;

/**
 * Gönderi detayı (S12, public). Tek sorguda kart alanları + silinme/moderasyon işareti + yazarın
 * durumu ve görüntüleyenle iki yönlü engel; ardından mention'lar için tek batch (sabit 2 sorgu).
 * Silinmiş gönderinin içeriği okunsa da dışarı verilmez. Anonimde `viewer` alanı yoktur (kart
 * salt okunur). Sahibi kendi gönderisini, yazar engeli/hesap durumu ne olursa olsun görür.
 */
export const findPostDetail = async (
  db: PrismaClient,
  viewer: DetailViewer,
  postId: number
): Promise<PostDetail> => {
  if (!postIdSchema.safeParse(postId).success) {
    return { status: 'not-found' };
  }
  // 0 hiçbir kullanıcıya karşılık gelmez (autoincrement 1'den başlar): anonimde beğeni/engel boş
  const viewerId = viewer?.userId ?? 0;
  const row = await db.post.findUnique({
    where: { postId },
    select: {
      ...postCardSelect(viewerId),
      deletedAt: true,
      removedByModeration: true,
      user: {
        select: {
          username: true,
          displayName: true,
          profilePhoto: true,
          status: true,
          blocking: { where: { blockedId: viewerId }, select: { id: true }, take: 1 },
          blockedBy: { where: { blockerId: viewerId }, select: { id: true }, take: 1 },
        },
      },
    },
  });
  if (row === null) return { status: 'not-found' };
  const isOwner = viewer !== null && row.userId === viewer.userId;
  if (row.deletedAt !== null) {
    return { status: 'removed', byModeration: isOwner && row.removedByModeration };
  }
  const blocked = row.user.blocking.length > 0 || row.user.blockedBy.length > 0;
  if (!isOwner && (blocked || row.user.status !== 'active')) return { status: 'unavailable' };

  const users = await loadMentionUsers(db, collectRenderRefs([row]));
  const card = toPostCardData(row, viewerId, users);
  if (viewer !== null) return { status: 'ok', post: card };
  const { viewer: _anonymous, ...readOnly } = card;
  return { status: 'ok', post: readOnly };
};

/**
 * DAL: görüntüleyen oturumdan; React `cache` ile istek başına bir kez (`generateMetadata` ve
 * sayfa aynı sonucu paylaşır).
 */
export const getPostById = cache(async (postId: number): Promise<PostDetail> =>
  findPostDetail(getDb(), await getCurrentUser(), postId)
);
