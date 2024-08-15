import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/app/api/api-utils/api-utils';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'error on getting post' }, { status: 400 });
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    await auth.verifyIdToken(token);

    const postIdToNumber = parseInt(postId ?? '');
    const post = await prisma.post.findUnique({
      where: {
        postId: postIdToNumber,
      },
    });

    if (!post) {
      return createResponse(ResponseStatus.NOT_FOUND);
    }

    return createResponse(ResponseStatus.OK, post);
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
