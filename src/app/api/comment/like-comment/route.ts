import prisma from '@/services/prisma-service/prisma-client';
import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';

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
    const commentId = body['commentId'];

    // Check if the comment exists
    const comment = await prisma.comment.findUnique({
      where: {
        commentId: commentId,
      },
    });

    if (!comment) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Gönderi bulunamadı.');
    }

    // Check if the user has already liked the comment
    const existingLike = await prisma.commentLikes.findUnique({
      where: {
        userId_commentId: {
          commentId: commentId,
          userId: currentUser.userId,
        },
      },
    });

    let isUnlike = false;

    if (existingLike) {
      // If the user has already liked the comment, unlike it
      await prisma.commentLikes.delete({
        where: {
          userId_commentId: {
            userId: currentUser.userId,
            commentId: commentId,
          },
        },
      });

      isUnlike = true;
    } else {
      // If the user hasn't liked the comment, like it
      await prisma.commentLikes.create({
        data: {
          commentId: commentId,
          userId: currentUser.userId,
          likedAt: new Date(),
        },
      });
    }

    return createResponse(ResponseStatus.OK, { isUnlike });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
