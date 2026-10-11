import 'server-only';

import type { PrismaClient } from '@/generated/prisma/client';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

import type { PostCardData } from '../types';

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
