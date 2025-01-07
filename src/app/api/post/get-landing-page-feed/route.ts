import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  try {
    const topPosts = await prisma.post.findMany({
      take: 10,
      orderBy: [
        {
          likedBy: {
            _count: 'desc',
          },
        },
        {
          comments: {
            _count: 'desc',
          },
        },
      ],
      select: {
        postId: true,
        content: true,
        mediaUrl: true,
        createdAt: true,
        sentiment: true,
        user: {
          select: {
            userId: true,
            displayName: true,
            username: true,
            profilePhoto: true,
          },
        },
      },
    });

    const postsWithLikeAndCommentInfo = topPosts.map(post => ({
      ...post,
    }));

    return createResponse(ResponseStatus.OK, {
      posts: postsWithLikeAndCommentInfo,
    });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
