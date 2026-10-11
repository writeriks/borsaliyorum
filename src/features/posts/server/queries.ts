import 'server-only';

import { cache } from 'react';

import type { PrismaClient } from '@/generated/prisma/client';
import { getCurrentUser } from '@/lib/auth/session';
import { collectRenderRefs, loadMentionUsers } from '@/lib/content/render-refs';
import { getDb } from '@/lib/db';

import type { PostCardData, PostDetail } from '../types';

import { mentionIdsOf, postCardSelect, toPostCardData } from './post-card-select';

/**
 * Gönderi kartı okuma yardımcıları. S10 kapsamında yalnızca "son gönderilerin" listesi (akış
 * yer tutucusunda, yeni gönderinin göründüğü yer); S11 akış sorguları aynı DTO eşlemesini
 * (`toPostCardData`) kullanır. DTO dışına e-posta/uid çıkmaz.
 */

/** Görüntüleyenin silinmemiş son gönderileri; sayfa başına sabit 2 sorgu (gönderiler + mention'lar). */
export const listOwnRecentPosts = async (
  db: PrismaClient,
  viewerId: number,
  limit = 20
): Promise<PostCardData[]> => {
  const rows = await db.post.findMany({
    where: { userId: viewerId, deletedAt: null },
    orderBy: [{ createdAt: 'desc' }, { postId: 'desc' }],
    take: limit,
    select: postCardSelect(viewerId),
  });
  const mentionIds = [...new Set(rows.flatMap(row => mentionIdsOf(row.entities)))];
  const users =
    mentionIds.length === 0
      ? []
      : await db.user.findMany({
          where: { userId: { in: mentionIds }, status: 'active' },
          select: { userId: true, username: true, displayName: true },
        });
  return rows.map(row => toPostCardData(row, viewerId, users));
};

/** DAL: yetki burada (girişli değilse boş liste). */
export const getMyRecentPosts = async (): Promise<PostCardData[]> => {
  const viewer = await getCurrentUser();
  if (viewer === null) return [];
  return listOwnRecentPosts(getDb(), viewer.userId);
};

/** Detayı okuyan: girişli kullanıcı ya da anonim (`null`). Yalnızca iç kimlik gerekir. */
export type DetailViewer = { readonly userId: number } | null;

/** Gönderi kimliği int4 aralığında pozitif tam sayı; dışı 404. */
export const MAX_POST_ID = 2_147_483_647;

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
  if (!Number.isInteger(postId) || postId < 1 || postId > MAX_POST_ID) {
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
