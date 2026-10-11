import 'server-only';

import { recordContentEvent } from '@/lib/audit/content-event';
import { consumeWriteRateLimit } from '@/lib/content/rate-limits';
import {
  findReadyPreviewId,
  mentionRecipients,
  resolveMentions,
  resolveStocks,
  toStoredEntities,
  upsertTags,
} from '@/lib/content/resolve';
import {
  acceptedPreviewUrl,
  analyzeContentForWrite,
  effectiveSentiment,
} from '@/lib/content/rules';
import { isUniqueViolation, type WriteDeps } from '@/lib/content/write-deps';
import { ErrorCode, fail, ok, type Result } from '@/lib/errors';

import type { CreatePostInput, DeletePostInput, SetPostLikeInput } from '../schemas';

export type CreatedPost = {
  readonly postId: number;
  /** Önbellekte hazır önizleme yoksa arka planda (`after()`) çekilecek URL. */
  readonly pendingPreviewUrl: string | null;
  /** Aynı `clientRequestId` ile önceki kayıt döndü (yeni satır yok). */
  readonly replayed: boolean;
};

type StoredPayload = {
  readonly postId: number;
  readonly content: string;
  readonly sentiment: string;
  readonly isSponsored: boolean;
};

/**
 * Aynı kullanıcı + aynı `clientRequestId`: yük aynıysa ilk kayıt döner (çift gönderim), farklıysa
 * `CONFLICT` (istemci yük değişince yeni kimlik üretir; aksi halde ör. sonradan açılan
 * sponsorluk etiketi sessizce düşerdi). Önizleme URL'si saklanmadığı için karşılaştırılmaz.
 */
const replay = (
  existing: StoredPayload,
  payload: Omit<StoredPayload, 'postId'>
): Result<CreatedPost> =>
  existing.content === payload.content &&
  existing.sentiment === payload.sentiment &&
  existing.isSponsored === payload.isSponsored
    ? ok({ postId: existing.postId, pendingPreviewUrl: null, replayed: true })
    : fail(ErrorCode.CONFLICT);

const findByRequestId = (deps: WriteDeps, clientRequestId: string) =>
  deps.db.post.findUnique({
    where: { userId_clientRequestId: { userId: deps.user.userId, clientRequestId } },
    select: { postId: true, content: true, sentiment: true, isSponsored: true },
  });

/**
 * Gönderi oluşturma (ADR-0002 Karar 7): rate limit → normalize/parse/sınırlar → idempotency →
 * hisse çözümü (bilinmeyen → `UNKNOWN_CASHTAG`) → sponsorlu + cashtag → tek transaction
 * (Tag upsert, Post + `_PostStocks` + `_PostTags`, mention bildirimleri, ContentEvent).
 * Oturum/e-posta kapısı çağıranda (`requireWriter`).
 */
export const createPostForUser = async (
  input: CreatePostInput,
  deps: WriteDeps
): Promise<Result<CreatedPost>> => {
  const { db, user } = deps;
  const now = deps.now();

  const limit = await consumeWriteRateLimit(db, 'post.create', user.userId, now);
  if (!limit.ok) return limit;

  const analyzed = analyzeContentForWrite(input.text, 'post');
  if (!analyzed.ok) return analyzed;
  const content = analyzed.data;
  const sentiment = effectiveSentiment(content, input.sentiment);
  const payload = { content: content.text, sentiment, isSponsored: input.isSponsored };

  const existing = await findByRequestId(deps, input.clientRequestId);
  if (existing) return replay(existing, payload);

  const stocks = await resolveStocks(db, content.tickers);
  if (!stocks.ok) return stocks;
  // Legal HD-2: sponsorlu gönderide yatırım aracı anılamaz (istemci de engeller, sunucu kesin)
  if (input.isSponsored && stocks.data.size > 0) return fail(ErrorCode.SPONSORED_CASHTAG_BLOCKED);

  const mentions = await resolveMentions(db, content.mentions);
  const recipients = await mentionRecipients(db, user.userId, mentions.values());
  const previewUrl = acceptedPreviewUrl(content, input.previewUrl);
  const readyPreviewId = previewUrl === null ? null : await findReadyPreviewId(db, previewUrl);

  let postId: number;
  try {
    postId = await db.$transaction(async tx => {
      const tags = await upsertTags(tx, content.hashtags, now);
      const entities = toStoredEntities(content.entities, {
        stocks: stocks.data,
        tags,
        mentions,
      });
      const post = await tx.post.create({
        data: {
          userId: user.userId,
          content: content.text,
          contentFormat: 2,
          entities,
          sentiment,
          isSponsored: input.isSponsored,
          clientRequestId: input.clientRequestId,
          linkPreviewId: readyPreviewId,
          createdAt: now,
          stocks: { create: [...stocks.data.values()].map(stockId => ({ stockId })) },
          tags: { create: [...new Set(tags.values())].map(tagId => ({ tagId })) },
        },
        select: { postId: true },
      });
      if (recipients.length > 0) {
        // M1'de bildirim teslimi (UI/push) yok: yalnızca kayıt. Metin render'da türden üretilir
        // (eski uygulama görünen adı metne gömüyordu; ad değişince bayatlıyordu).
        await tx.notification.createMany({
          data: recipients.map(recipientId => ({
            userId: recipientId,
            fromUserId: user.userId,
            type: 'MENTION' as const,
            content: '',
            postId: post.postId,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
      const recorded = await recordContentEvent(
        tx,
        {
          actorUserId: user.userId,
          action: 'post_create',
          entityType: 'post',
          entityId: post.postId,
          meta: deps.meta,
        },
        deps.ipKey()
      );
      if (!recorded) {
        deps.log.error('post.create event skipped: client IP unavailable', {
          requestId: deps.meta.requestId,
        });
      }
      return post.postId;
    });
  } catch (error) {
    // Aynı kimlikle eşzamanlı ikinci istek: kazanan kaydı yük karşılaştırmasıyla döndür
    if (isUniqueViolation(error)) {
      const winner = await findByRequestId(deps, input.clientRequestId);
      if (winner) return replay(winner, payload);
    }
    throw error;
  }

  return ok({
    postId,
    pendingPreviewUrl: previewUrl !== null && readyPreviewId === null ? previewUrl : null,
    replayed: false,
  });
};

/**
 * Soft delete (`deletedAt`) + `ContentEvent('post.delete')` (5651). Yalnızca sahibi siler
 * (moderasyon kaldırması ayrı akış: `moderation.remove`, admin paneli). Zaten silinmiş kendi
 * gönderisi → başarı (çift tıklama), olay ikinci kez yazılmaz.
 */
export const deletePostForUser = async (
  input: DeletePostInput,
  deps: WriteDeps
): Promise<Result<null>> => {
  const { db, user } = deps;
  const now = deps.now();
  const limit = await consumeWriteRateLimit(db, 'delete', user.userId, now);
  if (!limit.ok) return limit;

  const deleted = await db.$transaction(async tx => {
    const updated = await tx.post.updateMany({
      where: { postId: input.postId, userId: user.userId, deletedAt: null },
      data: { deletedAt: now },
    });
    if (updated.count === 0) return false;
    const recorded = await recordContentEvent(
      tx,
      {
        actorUserId: user.userId,
        action: 'post_delete',
        entityType: 'post',
        entityId: input.postId,
        meta: deps.meta,
      },
      deps.ipKey()
    );
    if (!recorded) {
      deps.log.error('post.delete event skipped: client IP unavailable', {
        requestId: deps.meta.requestId,
      });
    }
    return true;
  });
  if (deleted) return ok(null);

  const post = await db.post.findUnique({
    where: { postId: input.postId },
    select: { userId: true, deletedAt: true },
  });
  if (post === null) return fail(ErrorCode.NOT_FOUND);
  if (post.userId !== user.userId) {
    return fail(post.deletedAt === null ? ErrorCode.FORBIDDEN : ErrorCode.NOT_FOUND);
  }
  return ok(null);
};

/**
 * Beğeni durumu (idempotent): `liked: true` iki kez → tek satır; eşzamanlı istekler
 * `ON CONFLICT DO NOTHING` ile çakışmaz. Silinmiş/olmayan gönderi → `NOT_FOUND`.
 */
export const setPostLikeForUser = async (
  input: SetPostLikeInput,
  deps: WriteDeps
): Promise<Result<{ liked: boolean }>> => {
  const { db, user } = deps;
  const now = deps.now();
  const limit = await consumeWriteRateLimit(db, 'like', user.userId, now);
  if (!limit.ok) return limit;

  const post = await db.post.findFirst({
    where: { postId: input.postId, deletedAt: null },
    select: { postId: true },
  });
  if (post === null) return fail(ErrorCode.NOT_FOUND);

  if (input.liked) {
    await db.postLike.createMany({
      data: [{ userId: user.userId, postId: input.postId, likedAt: now }],
      skipDuplicates: true,
    });
  } else {
    await db.postLike.deleteMany({ where: { userId: user.userId, postId: input.postId } });
  }
  return ok({ liked: input.liked });
};
