import { UserId } from '@/services/firebase-service/types/db-types/user';
import { Timestamp } from 'firebase/firestore';

export interface UserFollowers {
  followerId: UserId;
  followedId: UserId;
  followetAt: Timestamp;
  isNotified: boolean; // May be removed
}

export enum UserFollowersEnum {
  FOLLOWER_ID = 'followerId',
  FOLLOWED_ID = 'followedId',
  FOLLOWET_AT = 'followetAt',
  IS_NOTIFIED = 'isNotified',
}
