import prisma from '@/services/prisma-service/prisma-client';
import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';
import feedService from '@/services/feed-service/feed-service';

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

    // Get following users
    const followingUserIds = await feedService.getFollowingUserIds(currentUser.userId);

    if (followingUserIds.length === 0) {
      return createResponse(ResponseStatus.OK, {
        postsByDate: [],
        lastPostIdByDate: null,
      });
    }

    // Get blocked users
    const blockedUserIds = await feedService.getBlockedUserIds(currentUser.userId);

    // Get following stocks
    const followingStockIds = await feedService.getFollowingStockIds(currentUser.userId);

    const orderByCondition = {
      createdAt: 'desc',
    };

    // Fetch posts by following users, paginated and ordered by created date
    const postsByDate = await feedService.getPostsByFollowingUsersAndStocks({
      followingUserIds,
      followingStockIds,
      blockedUserIds,
      lastPostId,
      pageSize,
      orderByCondition,
      currentUserId: currentUser.userId,
    });

    // Add like, comment info, and likedByCurrentUser flag to each post
    const postsWithLikeAndCommentInfo = postsByDate.map(post => ({
      ...post,
      likedByCurrentUser: post.likedBy.length > 0,
      likeCount: post._count.likedBy,
      commentCount: post._count.comments,
    }));

    const newLastPostIdByDate =
      postsByDate.length > 0 ? postsByDate[postsByDate.length - 1].postId : null;

    return createResponse(ResponseStatus.OK, {
      postsByDate: postsWithLikeAndCommentInfo,
      lastPostIdByDate: newLastPostIdByDate,
    });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
