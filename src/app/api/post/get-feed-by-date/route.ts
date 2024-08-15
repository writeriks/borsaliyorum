import prisma from '@/services/prisma-service/prisma-client';
import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/app/api/api-utils/api-utils';

export async function GET(request: Request): Promise<Response> {
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

    // Fetch posts by following users, paginated and ordered by created date
    const postsByDate = await prisma.post.findMany({
      where: {
        userId: {
          in: followingUserIds,
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
    console.error('Error in GET handler:', error);
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
