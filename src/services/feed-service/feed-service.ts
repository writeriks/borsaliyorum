import prisma from '@/services/prisma-service/prisma-client';

class FeedService {
  // Fetch the IDs of users blocked by the current user and who have blocked the current user
  getBlockedUserIds = async (userId: number): Promise<number[]> => {
    const blockedUsersByCurrentUser = await prisma.userBlocks.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });

    const usersWhoBlockedCurrentUser = await prisma.userBlocks.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    });

    return [
      ...blockedUsersByCurrentUser.map(user => user.blockedId),
      ...usersWhoBlockedCurrentUser.map(user => user.blockerId),
    ];
  };

  // Fetch the IDs of users the current user is following
  getFollowingUserIds = async (userId: number): Promise<number[]> => {
    const followingUsers = await prisma.userFollowers.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return followingUsers.map(user => user.followingId);
  };

  // Fetch posts by following users, excluding blocked users
  getPostsByFollowingUsers = async (
    followingUserIds: number[],
    blockedUserIds: number[],
    lastPostId: number,
    pageSize: number,
    orderByCondition: object
  ): Promise<any> => {
    return prisma.post.findMany({
      where: {
        userId: { in: followingUserIds, notIn: blockedUserIds },
      },
      orderBy: orderByCondition,
      take: pageSize,
      cursor: lastPostId ? { postId: lastPostId } : undefined,
      skip: lastPostId ? 1 : 0,
    });
  };

  // Fetch the total like count for posts
  getTotalLikeCounts = async (postIds: number[]): Promise<Record<number, number>> => {
    const likeCounts = await prisma.postLikes.groupBy({
      by: ['postId'],
      _count: { postId: true },
      where: { postId: { in: postIds } },
    });

    return likeCounts.reduce(
      (acc, likeCount) => {
        acc[likeCount.postId] = likeCount._count.postId;
        return acc;
      },
      {} as Record<number, number>
    );
  };

  // Fetch the total comment count for posts
  getTotalCommentCounts = async (postIds: number[]): Promise<Record<number, number>> => {
    const commentCounts = await prisma.comment.groupBy({
      by: ['postId'],
      _count: { postId: true },
      where: { postId: { in: postIds } },
    });

    return commentCounts.reduce(
      (acc, commentCount) => {
        acc[commentCount.postId] = commentCount._count.postId;
        return acc;
      },
      {} as Record<number, number>
    );
  };

  // Fetch likes by the current user for posts
  getLikesByCurrentUser = async (postIds: number[], userId: number): Promise<Set<number>> => {
    const likedPosts = await prisma.postLikes.findMany({
      where: { postId: { in: postIds }, userId },
      select: { postId: true },
    });

    return new Set(likedPosts.map(like => like.postId));
  };
}

const feedService = new FeedService();
export default feedService;
