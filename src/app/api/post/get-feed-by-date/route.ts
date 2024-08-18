import prisma from '@/services/prisma-service/prisma-client';
import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<NextResponse> {
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

    const { searchParams } = new URL(request.url);
    const lastPostId = parseInt(searchParams.get('lastPostId') ?? '') || 0;
    const pageSize = 10;

    // Fetch the IDs of the users the current user is following
    const followingUsers = await prisma.userFollowers.findMany({
      where: {
        followerId: currentUser?.userId,
      },
      select: {
        followingId: true,
      },
    });

    const followingUserIds = followingUsers.map(user => user.followingId);

    if (followingUserIds.length === 0) {
      return createResponse(ResponseStatus.OK, {
        postsByDate: [],
        lastPostIdByDate: null,
      });
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

    // Fetch posts by following users, paginated and ordered by created date
    const postsByDate = await prisma.post.findMany({
      where: {
        userId: {
          in: followingUserIds,
          notIn: blockedUserIds,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: pageSize,
      cursor: lastPostId ? { postId: lastPostId } : undefined,
      skip: lastPostId ? 1 : 0, // Skip the last post if cursor is set
    });

    const newLastPostIdByDate =
      postsByDate.length > 0 ? postsByDate[postsByDate.length - 1].postId : null;

    return createResponse(ResponseStatus.OK, {
      postsByDate,
      lastPostIdByDate: newLastPostIdByDate,
    });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
