import { NextRequest, NextResponse } from 'next/server';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import prisma from '@/services/prisma-service/prisma-client';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { User } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = await verifyUserInRoute(request);

    // If verifyUserInRoute returns a NextResponse, it means authentication failed
    if (currentUser instanceof NextResponse) {
      return currentUser;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return createResponse(ResponseStatus.BAD_REQUEST, 'User ID is required');
    }

    const skip = (page - 1) * limit;

    // Get followings with pagination
    const followings = await prisma.userFollowers.findMany({
      where: {
        followerId: parseInt(userId),
      },
      include: {
        following: {
          select: {
            userId: true,
            username: true,
            displayName: true,
            profilePhoto: true,
            bio: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        followedAt: 'desc',
      },
    });

    // Get total count for pagination
    const totalCount = await prisma.userFollowers.count({
      where: {
        followerId: parseInt(userId),
      },
    });

    // Check if the current user is following each user
    const followingsWithFollowStatus = await Promise.all(
      followings.map(async following => {
        let isFollowing = false;

        const followRecord = await prisma.userFollowers.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUser.userId,
              followingId: following.following.userId,
            },
          },
        });

        isFollowing = !!followRecord;

        return {
          ...following.following,
          isFollowing,
        };
      })
    );

    return createResponse(ResponseStatus.OK, {
      followings: followingsWithFollowStatus,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching user followings:', error);
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch user followings');
  }
}
