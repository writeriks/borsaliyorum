import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/app/api/api-utils/api-utils';
import prisma from '@/services/prisma-service/prisma-client';

export async function DELETE(request: Request): Promise<Response> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    const decodedToken = await auth.verifyIdToken(token);

    const user = await prisma.user.findUnique({
      where: {
        firebaseUserId: decodedToken.uid,
      },
    });

    if (!user) {
      return createResponse(ResponseStatus.NOT_FOUND);
    }

    // Start a transaction to ensure that all operations succeed or fail together
    await prisma.$transaction(async p => {
      await p.notification.deleteMany({
        where: { userId: user.userId },
      });

      await p.commentLikes.deleteMany({
        where: { userId: user.userId },
      });

      await p.postLikes.deleteMany({
        where: { userId: user.userId },
      });

      await p.comment.deleteMany({
        where: { userId: user.userId },
      });

      await p.userFollowers.deleteMany({
        where: {
          OR: [{ followerId: user.userId }, { followingId: user.userId }],
        },
      });

      await p.userBlocks.deleteMany({
        where: {
          OR: [{ blockerId: user.userId }, { blockedId: user.userId }],
        },
      });

      await p.stockFollowers.deleteMany({
        where: { userId: user.userId },
      });

      await p.comment.deleteMany({
        where: {
          post: {
            userId: user.userId,
          },
        },
      });

      await p.post.deleteMany({
        where: { userId: user.userId },
      });

      await p.securityRole.deleteMany({
        where: { userId: user.userId },
      });

      await p.user.delete({
        where: { userId: user.userId },
      });
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
