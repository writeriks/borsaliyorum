import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import prisma from '@/services/prisma-service/prisma-client';
import feedService from '@/services/feed-service/feed-service';

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

    // Get blocked users
    const blockedUserIds = await feedService.getBlockedUserIds(currentUser.userId);

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

    // Fetch the likes for the current user for these comments
    const commentIds = comments.map(comment => comment.commentId);
    const likeCountMap = await feedService.getTotalLikeCounts(commentIds, true);

    // Get current user's likes
    const likedCommentsIds = await feedService.getLikesByCurrentUser(
      commentIds,
      currentUser.userId,
      true
    );

    // Add likeCount and likedByCurrentUser flag to each comment
    const commentsWithLikeInfo = comments.map(comment => ({
      ...comment,
      likedByCurrentUser: likedCommentsIds.has(comment.commentId),
      likeCount: likeCountMap[comment.commentId] || 0,
    }));

    // Determine the new lastCommentId for the next page
    const newLastCommentId = comments.length > 0 ? comments[comments.length - 1].commentId : null;

    return createResponse(ResponseStatus.OK, {
      comments: commentsWithLikeInfo,
      lastCommentId: newLastCommentId,
    });
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
