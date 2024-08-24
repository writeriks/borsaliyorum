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
    orderByCondition: object
  ): Promise<Post[]> => {
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
}

const feedService = new FeedService();
export default feedService;
