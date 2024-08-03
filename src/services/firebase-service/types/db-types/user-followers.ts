import { UserId } from '@/services/firebase-service/types/db-types/user';

export interface UserFollowers {
  followerId: UserId;
  followingId: UserId;
  followedAt: number;
  isNotified: boolean; // May be removed
}

export enum UserFollowersEnum {
  FOLLOWER_ID = 'followerId',
  FOLLOWING_ID = 'followingId',
  FOLLOWED_AT = 'followedAt',
  IS_NOTIFIED = 'isNotified',
}
