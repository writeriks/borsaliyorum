import { User } from '@prisma/client';

export interface UserWithFollowers extends Partial<User> {
  userFollowerCount: number;
  userFollowingCount: number;
  isFollowingUser: boolean;
  isProfileOwner: boolean;
}
