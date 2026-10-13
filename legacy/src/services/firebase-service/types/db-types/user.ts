// User Main Collection
export type UserCollection = User[];

export type UserId = string;

export interface User {
  userId: UserId;
  firebaseUserId: string;
  username: string;
  displayName: string;
  email: string;
  birthday?: number;
  profilePhoto?: string;
  coverPhoto?: string;
  bio?: string;
  theme?: Theme;
  website?: string;
  createdAt: number;
  updatedAt?: number;
  premiumEndDate?: number;
  isEmailVerified: boolean;
  lastReloadDate?: number;
  postsCount?: number;
  userFollowingCount?: number;
  userFollowersCount?: number;
  stockFollowingCount?: number;
}

export enum Theme {
  DARK = 'dark',
  LIGHT = 'light',
}

export enum UserEnum {
  USER_ID = 'userId',
  FIREBASE_USER_ID = 'firebaseUserId',
  USERNAME = 'username',
  DISPLAY_NAME = 'displayName',
  EMAIL = 'email',
  BIRTHDAY = 'birthday',
  PROFILE_PHOTO = 'profilePhoto',
  COVER_PHOTO = 'coverPhoto',
  BIO = 'bio',
  THEME = 'theme',
  WEBSITE = 'website',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  PREMIUM_END_DATE = 'premiumEndDate',
  IS_EMAIL_VERIFIED = 'isEmailVerified',
  LAST_RELOAD_DATE = 'lastReloadDate',
  POSTS_COUNT = 'postsCount',
  FOLLOWING_COUNT = 'userFollowingCount',
  FOLLOWERS_COUNT = 'userFollowersCount',
  STOCK_FOLLOWING_COUNT = 'stockFollowingCount',
}
