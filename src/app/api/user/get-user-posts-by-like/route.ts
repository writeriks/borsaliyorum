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

    // Fetch posts sorted by like counts
    const posts = await prisma.post.findMany({
      where: { userId: user.userId },
      orderBy: {
        likedBy: {
          _count: 'desc',
        },
      },
      take: pageSize,
      cursor: lastPostId ? { postId: lastPostId } : undefined,
      skip: lastPostId ? 1 : 0,
      include: {
        _count: { select: { likedBy: true, comments: true } },
        likedBy: { where: { userId: currentUser.userId }, select: { postId: true } },
      },
    });
    const postsWithInfo = posts.map(post => ({
      ...post,
      likedByCurrentUser: post.likedBy.length > 0,
      likeCount: post._count.likedBy,
      commentCount: post._count.comments,
    }));
    const newLastPostId = posts.length > 0 ? posts[posts.length - 1].postId : null;
    return createResponse(ResponseStatus.OK, {
      postsByLike: postsWithInfo,
      lastPostIdByLike: newLastPostId,
    });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
