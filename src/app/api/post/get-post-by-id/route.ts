import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import feedService from '@/services/feed-service/feed-service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

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

    const postIdToNumber = parseInt(postId ?? '');

    const likeCountMap = await feedService.getTotalLikeCounts([postIdToNumber]);
    const commentCountMap = await feedService.getTotalCommentCounts([postIdToNumber]);

    // Get current user's likes
    const likedPostIds = await feedService.getLikesByCurrentUser(
      [postIdToNumber],
      currentUser.userId
    );

    const post = await prisma.post.findUnique({
      where: {
        postId: postIdToNumber,
      },
    });

    if (!post) {
      return createResponse(ResponseStatus.NOT_FOUND);
    }

    return createResponse(ResponseStatus.OK, {
      ...post,
      likedByCurrentUser: likedPostIds.has(post.postId),
      likeCount: likeCountMap[postIdToNumber] || 0,
      commentCount: commentCountMap[postIdToNumber] || 0,
    });
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
