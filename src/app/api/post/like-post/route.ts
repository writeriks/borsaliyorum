import prisma from '@/services/prisma-service/prisma-client';
import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';
import { NotificationType } from '@prisma/client';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    const decodedToken = await auth.verifyIdToken(token);

    const currentUser = await prisma.user.findUnique({
      where: {
        firebaseUserId: decodedToken.uid,
      },
    });

    if (!currentUser) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    const body = await request.json();
    const postId = body['postId'];

    // Check if the post exists
    const post = await prisma.post.findUnique({
      where: {
        postId: postId,
      },
    });

    if (!post) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Gönderi bulunamadı.');
    }

    // Check if the user has already liked the post
    const existingLike = await prisma.postLikes.findUnique({
      where: {
        userId_postId: {
          postId: postId,
          userId: currentUser.userId,
        },
      },
    });

    let didLike = false;

    if (existingLike) {
      // If the user has already liked the post, unlike it
      await prisma.postLikes.delete({
        where: {
          userId_postId: {
            userId: currentUser.userId,
            postId: postId,
          },
        },
      });
    } else {
      await prisma.$transaction(async tx => {
        // If the user hasn't liked the post, like it
        await prisma.postLikes.create({
          data: {
            postId: postId,
            userId: currentUser.userId,
            likedAt: new Date(),
          },
        });

        // Do not create notification if the user is liking their own post
        if (post.userId !== currentUser.userId) {
          // Create notification
          await tx.notification.create({
            data: {
              userId: post.userId,
              fromUserId: currentUser.userId,
              type: NotificationType.LIKE,
              content: `${currentUser.displayName} bir gönderini beğendi.`,
              postId: postId,
              read: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      });

      didLike = true;
    }

    return createResponse(ResponseStatus.OK, { didLike });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
