import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { User } from '@prisma/client';

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const postId = parseInt(searchParams.get('postId') ?? '');
    const userId = parseInt(searchParams.get('userId') ?? '');

    // Validate input
    if (!postId || !userId) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

    const currentUser = (await verifyUserInRoute(request)) as User;

    if (currentUser.userId !== userId) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    // Check if the post exists and if it belongs to the user
    const post = await prisma.post.findUnique({
      where: {
        postId,
      },
      select: {
        comments: true,
        userId: true,
      },
    });

    if (!post) {
      return createResponse(ResponseStatus.BAD_REQUEST, 'Gönderi bulunamadı.');
    }

    if (post.userId !== userId) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    // Use a transaction to delete likes, comment likes, comments, reposts, and the post atomically
    await prisma.$transaction([
      // Delete all post likes
      prisma.postLikes.deleteMany({
        where: {
          postId,
        },
      }),
      // Delete all comment likes
      prisma.commentLikes.deleteMany({
        where: {
          commentId: {
            in: post.comments.map(comment => comment.commentId), // Map to get all commentIds
          },
        },
      }),
      // Delete all comments associated with the post
      prisma.comment.deleteMany({
        where: {
          postId,
        },
      }),
      // Delete all reposts associated with the post
      prisma.repost.deleteMany({
        where: {
          postId,
        },
      }),
      // Delete the post
      prisma.post.delete({
        where: {
          postId,
        },
      }),
    ]);

    return createResponse(ResponseStatus.OK, { deletedPostId: postId });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
