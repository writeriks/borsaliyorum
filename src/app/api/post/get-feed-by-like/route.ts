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
        postsByLike: [],
        lastPostIdByLike: null,
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

    // Fetch posts by following users, paginated and ordered by like count
    const postsByLike = await prisma.post.findMany({
      where: {
        userId: {
          in: followingUserIds,
          notIn: blockedUserIds,
        },
      },
      orderBy: {
        likedBy: {
          _count: 'desc',
        },
      },
      take: pageSize,
      cursor: lastPostId ? { postId: lastPostId } : undefined,
      skip: lastPostId ? 1 : 0, // Skip the last post from the previous page
    });

    // Fetch the likes for the current user for these posts
    const postIds = postsByLike.map(post => post.postId);
    const likedPosts = await prisma.postLikes.findMany({
      where: {
        postId: {
          in: postIds,
        },
        userId: currentUser.userId,
      },
      select: {
        postId: true,
      },
    });

    const likedPostIds = new Set(likedPosts.map(like => like.postId));

    // Add likedByCurrentUser flag to each post
    const postsWithLikeInfo = postsByLike.map(post => ({
      ...post,
      likedByCurrentUser: likedPostIds.has(post.postId),
    }));

    const newLastPostIdByLike =
      postsByLike.length > 0 ? postsByLike[postsByLike.length - 1].postId : null;

    return createResponse(ResponseStatus.OK, {
      postsByLike: postsWithLikeInfo,
      lastPostIdByLike: newLastPostIdByLike,
    });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
