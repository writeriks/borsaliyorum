import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import prisma from '@/services/prisma-service/prisma-client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const lastCommentId = searchParams.get('lastCommentId');
    const pageSize = 10;

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

    if (!postId) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

    // Fetch the IDs of users that have blocked by the current user
    const blockedUsersByCurrentUser = await prisma.userBlocks.findMany({
      where: {
        blockerId: currentUser.userId,
      },
      select: {
        blockedId: true,
      },
    });

    // Fetch the IDs of users who have blocked the current user
    const usersWhoBlockedCurrentUser = await prisma.userBlocks.findMany({
      where: {
        blockedId: currentUser.userId,
      },
      select: {
        blockerId: true,
      },
    });

    const blockedUserIds = [
      ...blockedUsersByCurrentUser.map(user => user.blockedId),
      ...usersWhoBlockedCurrentUser.map(user => user.blockerId),
    ];

    const comments = await prisma.comment.findMany({
      where: {
        postId: parseInt(postId),
        userId: { notIn: blockedUserIds },
      },
      take: pageSize,
      cursor: lastCommentId ? { commentId: parseInt(lastCommentId) } : undefined,
      skip: lastCommentId ? 1 : 0, // Skip the last comment if cursor is set
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Determine the new lastCommentId for the next page
    const newLastCommentId = comments.length > 0 ? comments[comments.length - 1].commentId : null;

    return createResponse(ResponseStatus.OK, {
      comments,
      lastCommentId: newLastCommentId,
    });
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
