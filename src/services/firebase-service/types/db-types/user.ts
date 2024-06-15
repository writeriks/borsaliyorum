import { Timestamp } from "firebase/firestore";

// User Main Collection
export type UserCollection = User[];

export type UserId = string;

export interface User {
  userId: UserId;
  username: string;
  email: string;
  birthday?: Timestamp;
  profilePhoto?: string;
  coverPhoto?: string;
  bio?: string;
  theme?: Theme;
  website?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  premiumEndDate?: Timestamp;
  isEmailVerified?: boolean;
  lastReloadDate?: Timestamp;
  postsCount?: number;
  userFollowingCount?: number;
  userFollowersCount?: number;
  stockFollowingCount?: number;
}

export enum Theme {
  DARK = "dark",
  LIGHT = "light",
}

export enum UserEnum {
  USER_ID = "userId",
  USERNAME = "username",
  EMAIL = "email",
  BIRTHDAY = "birthday",
  PROFILE_PHOTO = "profilePhoto",
  COVER_PHOTO = "coverPhoto",
  BIO = "bio",
  THEME = "theme",
  WEBSITE = "website",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  PREMIUM_END_DATE = "premiumEndDate",
  IS_EMAIL_VERIFIED = "isEmailVerified",
  LAST_RELOAD_DATE = "lastReloadDate",
  POSTS_COUNT = "postsCount",
  FOLLOWING_COUNT = "userFollowingCount",
  FOLLOWERS_COUNT = "userFollowersCount",
  STOCK_FOLLOWING_COUNT = "stockFollowingCount",
}
