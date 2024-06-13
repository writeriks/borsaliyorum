import { PostId } from "@/services/firebase-service/types/db-types/post";
import { StockId } from "@/services/firebase-service/types/db-types/stock";
import { Timestamp } from "firebase/firestore";

// User Main Collection
export type UserCollection = User[];

export type UserId = string;

export interface User {
  userId: UserId;
  username: string;
  email: string;
  birthday: Timestamp;
  profilePhoto: string;
  coverPhoto: string;
  bio: string;
  theme: Theme;
  website: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPremiumUser: boolean;
  isVerifiedUser: boolean;
  lastReloadDate: Timestamp;
  postsCount: number;
  userFollowingCount: number;
  userFollowersCount: number;
  stockFollowingCount: number;
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
  IS_PREMIUM_USER = "isPremiumUser",
  IS_VERIFIED_USER = "isVerifiedUser",
  LAST_RELOAD_DATE = "lastReloadDate",
  POSTS_COUNT = "postsCount",
  FOLLOWING_COUNT = "userFollowingCount",
  FOLLOWERS_COUNT = "userFollowersCount",
  STOCK_FOLLOWING_COUNT = "stockFollowingCount",
}
