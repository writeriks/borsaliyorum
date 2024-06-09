import { PostId } from "@/services/firebase-service/types/collections/post";
import { StockId } from "@/services/firebase-service/types/collections/stock";
import { Timestamp } from "firebase/firestore";

// User Main Collection
export type UserCollection = User[];

export type UserId = string;

export interface User {
  userId: UserId;
  posts: PostId[];
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
  followedStocks: StockId[];
  followedUsers: UserId[];
  followedByUsers: UserId[];
}

export enum Theme {
  DARK = "dark",
  LIGHT = "light",
}

export enum UserEnum {
  USER_ID = "userId",
  POSTS = "posts",
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
  FOLLOWED_STOCKS = "followedStocks",
  FOLLOWED_USERS = "followedUsers",
  FOLLOWED_BY_USERS = "followedByUsers",
}
