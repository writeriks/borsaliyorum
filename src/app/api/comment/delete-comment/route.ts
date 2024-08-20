import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma-service/prisma-client';
import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = parseInt(searchParams.get('commentId') ?? '');
    const userId = parseInt(searchParams.get('userId') ?? '');

    // Validate input
    if (!commentId || !userId) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

    // Verify and decode token
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

    if (currentUser.userId !== userId) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    // Check if the comment exists and if it belongs to the user
    const comment = await prisma.comment.findUnique({
      where: {
        commentId: commentId,
      },
    });

    if (!comment) {
      return createResponse(ResponseStatus.BAD_REQUEST, 'Yorum bulunamadı.');
    }

    if (comment.userId !== userId) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    // Use a transaction to delete the comment likes and the comment atomically
    await prisma.$transaction([
      prisma.commentLikes.deleteMany({
        where: {
          commentId: commentId,
        },
      }),
      prisma.comment.delete({
        where: {
          commentId: commentId,
        },
      }),
    ]);

    return createResponse(ResponseStatus.OK, { deletedCommentId: commentId });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
