import { FollowersCollection } from "@/services/firebase-service/types/collections/followers";
import { FollowingCollection } from "@/services/firebase-service/types/collections/followings";
import { PostId } from "@/services/firebase-service/types/collections/post";
import { Timestamp } from "firebase/firestore";

export type UserId = string;

export enum Theme {
  DARK = "dark",
  LIGHT = "light",
}

export interface User {
  userId: UserId;
  posts: PostId[];
  username: string;
  email: string;
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
  followingCount: number;
  followersCount: number;
  following: FollowingCollection | null;
  followers: FollowersCollection | null;
}

export enum UserEnum {
  USER_ID = "userId",
  POSTS = "posts",
  USERNAME = "username",
  EMAIL = "email",
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
  FOLLOWING_COUNT = "followingCount",
  FOLLOWERS_COUNT = "followersCount",
  FOLLOWING = "following",
  FOLLOWERS = "followers",
}
