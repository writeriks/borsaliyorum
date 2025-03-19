import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { User } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = (await verifyUserInRoute(request)) as User;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

    const [stocks, tags, users] = await Promise.all([
      prisma.stock.findMany({
        where: {
          OR: [
            { ticker: { contains: query, mode: 'insensitive' } },
            { companyName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 3,
      }),
      prisma.tag.findMany({
        where: { tagName: { contains: query, mode: 'insensitive' } },
        take: 3,
        include: { posts: true },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
          ],
          userId: { not: userId },
        },
        take: 3,
      }),
    ]);

    const tagResults = tags.map(tag => ({
      tag,
      postCount: tag.posts.length,
    }));

    return createResponse(ResponseStatus.OK, { stocks, tags: tagResults, users });
  } catch (error: any) {
    return createResponse(ResponseStatus.BAD_REQUEST, error);
  }
}
