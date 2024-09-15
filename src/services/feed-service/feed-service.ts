import prisma from '@/services/prisma-service/prisma-client';
import { Post } from '@prisma/client';

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
    return followingUsers.map(user => user.followingId);
  };

  /**
   * Fetches posts by users that the current user is following, excluding posts from blocked users.
   *
   * @param followingUserIds - An array of user IDs that the current user is following.
   * @param blockedUserIds - An array of user IDs that the current user has blocked or is blocked by.
   * @param lastPostId - The ID of the last post for pagination.
   * @param pageSize - The number of posts to retrieve.
   * @param orderByCondition - The condition for ordering the posts.
   * @returns A promise that resolves to an array of posts.
   */
  getPostsByFollowingUsers = async (
    followingUserIds: number[],
    blockedUserIds: number[],
    lastPostId: number,
    pageSize: number,
    orderByCondition: object,
    currentUserId?: number
  ): Promise<Post[]> => {
    const blockedUsersWithCurrentUser = blockedUserIds.concat(currentUserId ?? -1);
    // Fetch posts from followed users and their reposts, excluding blocked users
    const postsWithReposts = await prisma.post.findMany({
      where: {
        OR: [
          // Posts by users the current user follows
          {
            userId: {
              in: followingUserIds,
              notIn: blockedUsersWithCurrentUser,
            },
          },
          // Reposts made by users the current user follows, excluding reposts from blocked users
          {
            reposts: {
              some: {
                repostedBy: {
                  in: followingUserIds,
                  notIn: blockedUserIds,
                },
                repostedFrom: {
                  notIn: blockedUserIds,
                },
              },
            },
          },
        ],
      },
      orderBy: orderByCondition,
      take: pageSize,
      cursor: lastPostId ? { postId: lastPostId } : undefined,
      skip: lastPostId ? 1 : 0,
      include: {
        reposts: true,
      },
    });

    // Duplicate posts that have been reposted by followed users
    const transformedPosts = postsWithReposts.flatMap(post => {
      const repostEntries = post.reposts
        .filter(repost => followingUserIds.includes(repost.repostedBy)) // Filter reposts by followed users
        .map(repost => ({
          ...post,
          isRepost: true,
          repostedBy: repost.repostedBy, // The user who reposted
          repostDate: repost.repostDate, // The date of the repost
          reposts: post.reposts.filter(r => r.repostedBy !== currentUserId),
        }));

      // Return the original post along with all repost entries (duplicates)
      return [
        {
          ...post,
          isRepost: false, // Mark as the original post
          repostedBy: null,
          repostDate: null,
        },
        ...repostEntries,
      ];
    });

    // Return paginated results filtering current user posts if they are not repost
    return transformedPosts.filter(
      post => post.userId !== currentUserId || (post.isRepost && post.userId === currentUserId)
    );
  };

  /**
   * Fetches the total like count for posts or comments.
   *
   * @param entryIds - An array of IDs for the posts or comments.
   * @param isComment - A boolean indicating whether the IDs are for comments (true) or posts (false).
   * @returns A promise that resolves to an object where keys are entry IDs and values are like counts.
   */
  getTotalLikeCounts = async (
    entryIds: number[],
    isComment = false
  ): Promise<Record<number, number>> => {
    if (isComment) {
      const likeCounts = await prisma.commentLikes.groupBy({
        by: ['commentId'],
        _count: { commentId: true },
        where: { commentId: { in: entryIds } },
      });

      return likeCounts.reduce(
        (acc, likeCount) => {
          acc[likeCount.commentId] = likeCount._count.commentId;
          return acc;
        },
        {} as Record<number, number>
      );
    } else {
      const likeCounts = await prisma.postLikes.groupBy({
        by: ['postId'],
        _count: { postId: true },
        where: { postId: { in: entryIds } },
      });

      return likeCounts.reduce(
        (acc, likeCount) => {
          acc[likeCount.postId] = likeCount._count.postId;
          return acc;
        },
        {} as Record<number, number>
      );
    }
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
   * Fetches the total comment count for a set of posts.
   *
   * @param postIds - An array of post IDs.
   * @returns A promise that resolves to an object where keys are post IDs and values are comment counts.
   */
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

  /**
   * Fetches the likes by the current user for a set of posts or comments.
   *
   * @param entryIds - An array of IDs for the posts or comments.
   * @param userId - The ID of the current user.
   * @param isComment - A boolean indicating whether the IDs are for comments (true) or posts (false).
   * @returns A promise that resolves to a set of entry IDs liked by the user.
   */
  getLikesByCurrentUser = async (
    entryIds: number[],
    userId: number,
    isComment = false
  ): Promise<Set<number>> => {
    if (isComment) {
      const likedComments = await prisma.commentLikes.findMany({
        where: { commentId: { in: entryIds }, userId },
        select: { commentId: true },
      });

      return new Set(likedComments.map(like => like.commentId));
    } else {
      const likedPosts = await prisma.postLikes.findMany({
        where: { postId: { in: entryIds }, userId },
        select: { postId: true },
      });

      return new Set(likedPosts.map(like => like.postId));
    }
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
