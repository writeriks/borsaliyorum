import { UserId } from "@/services/firebase-service/types/collections/user";
import { Timestamp } from "firebase/firestore";

export interface FollowersCollection {
  userId: UserId;
  followers: Follower[];
}

export interface Follower {
  followed_by: UserId;
  createdAt: Timestamp;
}

export enum FollowersCollectionEnum {
  USER_ID = "userId",
  FOLLOWERS = "followers",
}

export enum FollowerEnum {
  FOLLOWED_BY = "followed_by",
  CREATED_AT = "createdAt",
}
