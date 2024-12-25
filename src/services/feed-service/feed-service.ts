import prisma from '@/services/prisma-service/prisma-client';

class FeedService {
  /**
   * Fetches the IDs of users who are blocked by the current user or who have blocked the current user.
   *
   * @param userId - The ID of the current user.
   * @returns A promise that resolves to an array of user IDs.
   */
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

  /**
   * Fetches the IDs of users that the current user is following.
   *
   * @param userId - The ID of the current user.
   * @returns A promise that resolves to an array of user IDs.
   */
  getFollowingUserIds = async (userId: number): Promise<number[]> => {
    const followingUsers = await prisma.userFollowers.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return followingUsers.map(user => user.followingId).concat(userId);
  };

  /**
   * Fetches the IDs of stocks that the current user is following.
   *
   * @param currentUserId - The ID of the current user.
   * @returns A promise that resolves to an array of stock IDs.
   */
  getFollowingStockIds = async (currentUserId: number): Promise<number[]> => {
    // Fetch stock IDs from the StockFollowers table where the current user is a follower
    const followingStocks = await prisma.stockFollowers.findMany({
      where: {
        userId: currentUserId,
      },
      select: {
        stockId: true,
      },
    });

    // Extract stock IDs into an array
    return followingStocks.map(stockFollower => stockFollower.stockId);
  };

  /**
   * Fetches posts by users and stocks that the current user is following, excluding posts from blocked users.
   *
   * @param followingUserIds - An array of user IDs that the current user is following.
   * @param followingStockIds - An array of stock IDs that the current user is following.
   * @param blockedUserIds - An array of user IDs that the current user has blocked or is blocked by.
   * @param lastPostId - The ID of the last post for pagination.
   * @param pageSize - The number of posts to retrieve.
   * @param orderByCondition - The condition for ordering the posts.
   * @returns A promise that resolves to an array of posts.
   */
  getPostsByFollowingUsersAndStocks = async ({
    followingUserIds,
    followingStockIds,
    blockedUserIds,
    lastPostId,
    pageSize,
    orderByCondition,
    currentUserId,
  }: {
    followingUserIds: number[];
    followingStockIds: number[];
    blockedUserIds: number[];
    lastPostId: number;
    pageSize: number;
    orderByCondition: any;
    currentUserId?: number;
  }): Promise<
    {
      postId: number;
      likedBy: { postId: number }[];
      _count: { likedBy: number; comments: number };
    }[]
  > => {
    const blockedUsersWithCurrentUser = blockedUserIds.concat(currentUserId ?? -1);

    // Fetch posts from following users and following stocks, excluding blocked users
    const posts = await prisma.post.findMany({
      where: {
        AND: [
          // Exclude posts from blocked users
          {
            userId: { notIn: blockedUsersWithCurrentUser },
          },
          // Include posts by following users or associated with following stocks
          {
            OR: [
              // Posts by users the current user follows
              { userId: { in: followingUserIds } },
              // Posts associated with stocks the current user follows
              {
                stocks: {
                  some: { stockId: { in: followingStockIds } },
                },
              },
            ],
          },
        ],
      },
      orderBy: orderByCondition,
      take: pageSize,
      cursor: lastPostId ? { postId: lastPostId } : undefined,
      skip: lastPostId ? 1 : 0,
      include: {
        _count: { select: { likedBy: true, comments: true } },
        likedBy: { where: { userId: currentUserId }, select: { postId: true } },
        stocks: true,
      },
    });

    return posts;
  };

  /**
   * Fetches the total repost count for posts.
   *
   * @param postIds - An array of post IDs.
   * @returns A promise that resolves to an object where keys are post IDs and values are repost counts.
   */
  getTotalRepostCounts = async (postIds: number[]): Promise<Record<number, number>> => {
    const repostCounts = await prisma.repost.groupBy({
      by: ['postId'],
      _count: { postId: true },
      where: { postId: { in: postIds } },
    });

    return repostCounts.reduce(
      (acc, repostCount) => {
        acc[repostCount.postId] = repostCount._count.postId;
        return acc;
      },
      {} as Record<number, number>
    );
  };

  /**
   * Fetches the reposts by the current user for a set of posts.
   *
   * @param postIds - An array of post IDs to check if the user reposted.
   * @param userId - The ID of the current user.
   * @returns A promise that resolves to a set of post IDs reposted by the user.
   */
  getRepostsByCurrentUser = async (postIds: number[], userId: number): Promise<Set<number>> => {
    const repostedPosts = await prisma.repost.findMany({
      where: {
        postId: { in: postIds },
        repostedBy: userId,
      },
      select: { postId: true },
    });

    return new Set(repostedPosts.map(repost => repost.postId));
  };
}

const feedService = new FeedService();
export default feedService;
