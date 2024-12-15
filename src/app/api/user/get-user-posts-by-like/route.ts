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
    const username = searchParams.get('username');
    const pageSize = 10;

    if (!username) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı bulunamadı');
    }

    const user = await prisma.user.findUnique({
      where: { username: username },
    });

    if (!user) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı bulunamadı');
    }

    // Check if the current user is blocked by the user
    const isCurrentUserBlockedByUser = await prisma.userBlocks.findFirst({
      where: {
        blockedId: currentUser?.userId,
        blockerId: user.userId,
      },
    });

    if (isCurrentUserBlockedByUser) {
      return createResponse(ResponseStatus.BAD_REQUEST, 'Bu kullanıcı tarafından engellendiniz');
    }

    // Get User's posts by like
    const userPostsByLike = await prisma.post.findMany({
      where: {
        user: user,
      },
      orderBy: {
        likedBy: {
          _count: 'desc',
        },
      },
      take: pageSize,
      cursor: lastPostId ? { postId: lastPostId } : undefined,
      skip: lastPostId ? 1 : 0,
    });

    // Fetch the likes for the current user for these posts
    const postIds = userPostsByLike.map(post => post.postId);

    // Get likes, reposts and comments count for posts
    const likeCountMap = await feedService.getTotalLikeCounts(postIds);
    const commentCountMap = await feedService.getTotalCommentCounts(postIds);

    // Get current user's likes
    const likedPostIds = await feedService.getLikesByCurrentUser(postIds, currentUser.userId);

    // Add like, comment info, and likedByCurrentUser flag to each post
    const postsWithLikeAndCommentInfo = userPostsByLike.map(post => ({
      ...post,
      likedByCurrentUser: likedPostIds.has(post.postId),
      likeCount: likeCountMap[post.postId] || 0,
      commentCount: commentCountMap[post.postId] || 0,
    }));

    const newLastPostIdByLike =
      userPostsByLike.length > 0 ? userPostsByLike[userPostsByLike.length - 1].postId : null;

    return createResponse(ResponseStatus.OK, {
      postsByLike: postsWithLikeAndCommentInfo,
      lastPostIdByLike: newLastPostIdByLike,
    });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
