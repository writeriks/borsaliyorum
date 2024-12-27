import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { User } from '@prisma/client';

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = parseInt(searchParams.get('commentId') ?? '');

    // Validate input
    if (!commentId) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

    const currentUser = (await verifyUserInRoute(request)) as User;

    // Check if the comment exists and if it belongs to the user
    const comment = await prisma.comment.findUnique({
      where: {
        commentId: commentId,
      },
    });

    if (!comment) {
      return createResponse(ResponseStatus.BAD_REQUEST, 'Yorum bulunamadı.');
    }

    if (comment.userId !== currentUser.userId) {
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
