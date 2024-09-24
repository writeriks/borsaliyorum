import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  return createResponse(ResponseStatus.BAD_REQUEST);

  /*
    COMMENT THIS AS REPOST FUNCTIONALITY IS RETREACTED
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

    const body = await request.json();
    const postId = body['postId'];

    // Check if the post exists
    const post = await prisma.post.findUnique({
      where: {
        postId: postId,
      },
    });

    if (!post) {
      return createResponse(ResponseStatus.NOT_FOUND);
    }

    // Check if the user has already reposted this post
    const existingRepost = await prisma.repost.findUnique({
      where: {
        repostedBy_postId: {
          repostedBy: currentUser.userId,
          postId: postId,
        },
      },
    });

    let didRepost = false;

    if (existingRepost) {
      // If the repost exists, delete it (un-repost)
      await prisma.repost.delete({
        where: {
          repostedBy_postId: {
            repostedBy: currentUser.userId,
            postId: postId,
          },
        },
      });
    } else {
      // If the repost doesn't exist, create it
      await prisma.repost.create({
        data: {
          repostedBy: currentUser.userId,
          repostedFrom: post.userId,
          postId: postId,
          repostDate: new Date(),
        },
      });

      didRepost = true;
    }

    // TODO: Handle Mentions

    return createResponse(ResponseStatus.OK, { didRepost });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  } */
}
