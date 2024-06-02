import { UserId } from "@/services/firebase-service/types/collections/user";
import { Timestamp } from "firebase/firestore";

export interface FollowingCollection {
  userId: UserId;
  following: Following[];
}

export interface Following {
  following_to: UserId;
  createdAt: Timestamp;
}

export enum FollowingCollectionEnum {
  USER_ID = "userId",
  FOLLOWING = "following",
}
export enum FollowingEnum {
  FOLLOWING_TO = "following_to",
  CREATED_AT = "createdAt",
}
