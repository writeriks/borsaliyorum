import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const topPosts = await prisma.post.findMany({
      take: 10, // Limit results to the top 10
      orderBy: [
        {
          likedBy: {
            _count: 'desc', // Sort by number of likes
          },
        },
        {
          comments: {
            _count: 'desc', // Then sort by number of comments
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
            displayName: true, // Include user details if needed
            username: true,
            profilePhoto: true,
          },
        },
        _count: {
          select: {
            likedBy: true,
            comments: true,
          },
        },
      },
    });

    // Add like, comment info, and likedByCurrentUser flag to each post
    const postsWithLikeAndCommentInfo = topPosts.map(post => ({
      ...post,
      likeCount: post._count.likedBy,
      commentCount: post._count.comments,
    }));

    return createResponse(ResponseStatus.OK, {
      posts: postsWithLikeAndCommentInfo,
    });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
