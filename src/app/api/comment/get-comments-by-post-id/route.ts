import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import prisma from '@/services/prisma-service/prisma-client';

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

    await auth.verifyIdToken(token);

    if (!postId) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

    // TODO: Handle logic for fetching comments
    const comments = await prisma.comment.findMany({
      where: {
        postId: parseInt(postId),
        /* commentId: { gt: lastCommentId }, */
      },
      take: pageSize,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return createResponse(ResponseStatus.OK, {
      comments,
    });
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
