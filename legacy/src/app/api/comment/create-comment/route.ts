import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { MAX_CHARACTERS } from '@/services/api-service/post-api-service/constants';
import { auth } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import tagService from '@/services/tag-service/tag-service';
import { Comment, NotificationType } from '@prisma/client';

import { NextResponse } from 'next/server';
import { uploadImage } from '@/services/api-service/api-service-helper';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const imageData: string = body['imageData'];
    const comment: Comment = body['comment'];

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    const idToken = await auth.verifyIdToken(token);

    const user = await prisma.user.findUnique({
      where: {
        firebaseUserId: idToken.uid,
      },
    });

    if (!user) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    if (comment.content.length > MAX_CHARACTERS) {
      return createResponse(
        ResponseStatus.BAD_REQUEST,
        'İzin verilenden fazla karakter girdiniz. Lütfen daha kısa bir içerik girin.'
      );
    }

    const { cashtags, hashtags, mentions } = tagService.getTagsFromContent(comment.content);

    const stocksByCashtags = await prisma.stock.findMany({
      where: {
        ticker: {
          in: cashtags,
        },
      },
    });

    const isAnyCashtagInvalid = cashtags.some(
      cashtag => !stocksByCashtags.find(stock => stock.ticker === cashtag)
    );

    if (isAnyCashtagInvalid) {
      return createResponse(
        ResponseStatus.BAD_REQUEST,
        'Var olmayan bir hisse girdiniz. Lütfen geçerli bir hisse etiketleyin.'
      );
    }

    let downloadUrl: string | undefined;
    if (imageData) {
      downloadUrl = await uploadImage(imageData);
    }

    await tagService.createHashtags(hashtags);

    let createdComment = await prisma.$transaction(async tx => {
      const newComment = await tx.comment.create({
        data: {
          content: comment.content,
          mediaUrl: downloadUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
          post: {
            connect: {
              postId: comment.postId,
            },
          },
          user: {
            connect: {
              userId: user.userId,
            },
          },
        },
      });

      const post = await tx.post.findUnique({
        where: {
          postId: comment.postId,
        },
      });

      if (!post) {
        return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR, 'Bir hata oluştu.');
      }

      for (const mention of mentions) {
        if (!mention.startsWith('@')) continue;

        const username = mention.substring(1);

        // Do not create notification if the user is mentioning themselves
        if (username === user.username) continue;

        const mentionedUser = await tx.user.findUnique({
          where: { username },
        });

        if (mentionedUser) {
          // Create notification for the mentioned user
          await tx.notification.create({
            data: {
              userId: mentionedUser.userId,
              fromUserId: user.userId,
              type: NotificationType.MENTION,
              content: `${user.displayName} bir yorumda senden bahsetti.`,
              commentId: newComment.commentId,
              postId: comment.postId,
              read: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }

      // Do not create notification if the user is commenting on their own post
      if (post.userId !== user.userId) {
        // Create notification for the post owner
        await tx.notification.create({
          data: {
            userId: post.userId,
            fromUserId: user.userId,
            type: NotificationType.COMMENT,
            content: `${user.displayName} bir gönderine yorum yaptı.`,
            commentId: newComment.commentId,
            postId: comment.postId,
            read: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      return newComment;
    });

    return createResponse(ResponseStatus.OK, createdComment);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
